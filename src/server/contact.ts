// Le formulaire de contact, côté serveur. C’est la seule adresse du socle
// ouverte à un visiteur anonyme.
//
// Elle répond à un formulaire HTML ordinaire, jamais à du JavaScript : le site
// public n’en embarque aucun (invariant 5), et un lead perdu parce qu’un
// script n’a pas chargé coûterait plus cher que tout le reste. Le navigateur
// envoie donc un POST classique, et la réponse est une redirection vers la
// page d’origine, suivie d’un fragment que la feuille de style révèle.
//
// Le fragment est le seul canal de réponse dont dispose une page statique. Il
// en découle une contrainte assumée : un refus perd ce que le visiteur avait
// écrit. C’est pourquoi la validation du navigateur — `required`, `type`,
// `minlength` — porte l’essentiel du travail, et pourquoi celle-ci ne voit
// guère que ce qui n’est pas parti d’un navigateur.
//
// Trois défenses, aucun CAPTCHA : un champ leurre qu’un humain ne voit pas, la
// limitation par adresse, et un plafond pour le site entier qui protège le
// quota d’email. Le leurre rempli fait répondre « envoyé » sans rien écrire :
// un robot n’apprend rien de son échec.

import { z } from 'zod'

import { matchSlug, urlFor } from '../astro/routes.js'
import { routeOf, THANKS_PAGE } from '../content/naming.js'
import { readRoutes } from '../content/read.js'
import type { Panel } from './context.js'
import { HOUR, MINUTE } from './durations.js'
import { leadReceived } from './email/messages.js'
import {
  guardOrigin,
  json,
  originOf,
  refuseMethod,
  withinLength,
} from './http.js'
import {
  markDelivered,
  markSkipped,
  recordLead,
  type Lead,
  type NewLead,
} from './leads.js'
import { consume, type Rule } from './throttle.js'

export const CONTACT_PATH = '/api/contact'

/** Envois depuis une même adresse. Large pour un humain, étroit pour un robot. */
export const ADDRESS_RULE: Rule = { limit: 5, window: 15 * MINUTE }

/** Envois pour le site entier : ce qui protège le quota d’email du client. */
export const SITE_RULE: Rule = { limit: 60, window: HOUR }

/** Un corps de formulaire tient en quelques kilo-octets ; le reste est refusé. */
export const MAX_FORM_BYTES = 64 * 1024

const MESSAGE_MIN = 10
const MESSAGE_MAX = 4000

/**
 * Les fragments que la page révèle. Ils sont en français dans l’URL parce que
 * le visiteur les voit : c’est la seule chaîne du socle qui arrive dans une
 * barre d’adresse.
 */
export const MARKERS = {
  sent: 'message-envoye',
  refused: 'message-refuse',
  waiting: 'message-attente',
} as const

export type ContactOutcome = keyof typeof MARKERS

const Form = z.object({
  name: trimmed(1, 80),
  email: z.email().max(200),
  message: trimmed(MESSAGE_MIN, MESSAGE_MAX),
})

/**
 * Traite l’envoi d’un formulaire, ou rend `undefined` si l’adresse n’est pas
 * la sienne. Aucune session n’est demandée : le visiteur n’en a pas.
 */
export async function handleContact(
  panel: Panel,
  request: Request,
): Promise<Response | undefined> {
  if (new URL(request.url).pathname !== CONTACT_PATH) return undefined
  if (request.method !== 'POST') return refuseMethod()

  const guard = guardOrigin(request)

  if (guard !== undefined) return guard

  if (!withinLength(request, MAX_FORM_BYTES)) {
    return json({ ok: false, message: 'Message trop long.' }, 413)
  }

  const fields = await readForm(request)

  if (fields === undefined)
    return json({ ok: false, message: 'Formulaire illisible.' }, 400)

  const target = await destination(panel, String(fields['page'] ?? ''))

  // Le succès a son adresse quand le dépôt porte la page ; le refus et la
  // limite restent là où le visiteur a écrit.
  const answer = (outcome: ContactOutcome): Response =>
    seeOther(
      outcome === 'sent' && target.thanks !== undefined
        ? target.thanks
        : `${target.url}#${MARKERS[outcome]}`,
    )

  // Le leurre est le premier examen, et il se lit sur le corps brut : un robot
  // qui le remplit reçoit la même réponse qu’un envoi réussi, quoi qu’il ait
  // mis dans le reste du formulaire, et rien n’est écrit.
  if (String(fields['website'] ?? '').trim() !== '') return answer('sent')

  const { server } = panel
  const now = server.now()
  const origin = originOf(request)

  const allowed =
    consume(server.database, 'contact-ip', origin.ip, ADDRESS_RULE, now)
      .allowed &&
    consume(server.database, 'contact-site', '*', SITE_RULE, now).allowed

  if (!allowed) return answer('waiting')

  const submitted = Form.safeParse(fields)

  if (!submitted.success) return answer('refused')

  const written: NewLead = {
    at: now,
    name: submitted.data.name,
    email: submitted.data.email,
    message: submitted.data.message,
    page: target.route,
    language: target.language,
    ip: origin.ip,
    agent: origin.agent,
  }

  const id = recordLead(server.database, written)

  await notify(panel, { ...written, id, delivery: 'failed' })

  return answer('sent')
}

/**
 * Prévient le client, par les canaux que le site a. Le message est déjà en base
 * (D80) : un envoi qui échoue part sur la sortie d’erreur et n’enlève rien au
 * visiteur, qui a bien été reçu.
 *
 * Les deux canaux sont indépendants — l’un tombe sans emporter l’autre, et
 * c’est tout l’intérêt d’en avoir deux. La ligne retient ce qu’ils ont donné
 * ensemble : partie dès que l’un a confirmé, manquée quand tous ceux qui ont
 * été tentés ont échoué, et sans objet quand il n’y avait personne à prévenir.
 */
async function notify(panel: Panel, lead: Lead): Promise<void> {
  const { notify: allowed, to, provider, notifier } = panel.leads
  const byEmail = allowed && to !== '' && provider !== undefined

  // La sortie d’erreur n’est lue que pour comprendre pourquoi rien n’est
  // arrivé : elle se tait tant qu’un canal reste.
  if (!byEmail && notifier === undefined) {
    process.stderr.write(
      `Message reçu de ${lead.email}, gardé dans le panel : ${allowed ? 'aucun destinataire n’est configuré' : 'ce site ne prévient personne'}.\n`,
    )

    markSkipped(panel.server.database, lead.id)

    return
  }

  const reached = [
    byEmail
      ? await attempt(lead, 'par email', () =>
          provider.send({ to, ...leadReceived(panel.server.site.name, lead) }),
        )
      : false,
    notifier === undefined
      ? false
      : await attempt(lead, `à ${notifier.host}`, () => notifier.send(lead)),
  ]

  if (reached.includes(true)) markDelivered(panel.server.database, lead.id)
}

/** Rend `true` si le canal a confirmé ; sinon dit ce qui s’est passé. */
async function attempt(
  lead: Lead,
  channel: string,
  send: () => Promise<void>,
): Promise<boolean> {
  try {
    await send()

    return true
  } catch (cause) {
    process.stderr.write(
      `Le message de ${lead.email} n’a pas pu être notifié ${channel} : ${(cause as Error).message}\n`,
    )

    return false
  }
}

async function readForm(
  request: Request,
): Promise<Record<string, unknown> | undefined> {
  try {
    return Object.fromEntries(await request.formData())
  } catch {
    return undefined
  }
}

export type Destination = {
  readonly url: string
  readonly route: string
  readonly language: string
  /** L’adresse de la page de remerciement, quand le dépôt en porte une. */
  readonly thanks?: string
}

/**
 * Où renvoyer le visiteur. L’adresse est reconstruite depuis les pages du
 * dépôt, jamais recopiée de ce qui a été envoyé : une redirection ouverte
 * n’est pas possible, et une page inconnue ramène à la racine.
 *
 * Seuls les noms de fichiers sont lus, pas leur contenu : c’est la seule
 * adresse qu’un anonyme peut appeler en boucle, et lire toutes les pages du
 * dépôt avant même le leurre lui donnerait un levier.
 */
async function destination(panel: Panel, slug: string): Promise<Destination> {
  const { languages } = panel.site
  const routes = await readRoutes(panel.root)
  const found = matchSlug(clean(slug), routes, languages)
  const language = found?.language ?? languages.default.code
  const prefix = language === languages.default.code ? '' : language
  const thanks = routes.includes(routeOf(THANKS_PAGE))
    ? { thanks: directory(urlFor(routeOf(THANKS_PAGE), prefix)) }
    : {}

  if (found === undefined) {
    return { url: '/', route: '/', language, ...thanks }
  }

  return {
    url: directory(urlFor(found.route, prefix)),
    route: found.route,
    language,
    ...thanks,
  }
}

// Le site construit range une page dans son dossier : `/contact/index.html`.
// La barre finale désigne donc le fichier directement, sans dépendre de la
// façon dont le serveur de fichiers rétablit une adresse sans elle.
function directory(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

function clean(slug: string): string {
  return slug.replace(/^\/+/, '').replace(/\/+$/, '')
}

function seeOther(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location, 'cache-control': 'no-store' },
  })
}

// `trim` d’abord, bornes ensuite : un message fait de blancs est vide, et une
// borne comptée avant le nettoyage laisserait passer dix espaces.
function trimmed(min: number, max: number): z.ZodType<string> {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(min).max(max))
}
