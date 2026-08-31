// Le second canal : une adresse web que le site appelle dès qu’un message
// arrive.
//
// L’email seul ne suffit pas. Un artisan n’ouvre pas son panel tous les jours,
// et une boîte encombrée noie un lead qui coûte plus cher que le reste du site.
// Ce canal-ci aboutit là où le client regarde déjà — une conversation d’équipe,
// un service de notification, un automate.
//
// Le socle n’en connaît aucun : il envoie un JSON à l’adresse qu’on lui donne,
// exactement comme il envoie un email au fournisseur qu’on lui nomme (D13). Le
// corps porte `text` et `content` avec la même phrase, à côté des champs
// structurés : c’est ce qui fait qu’un webhook affiche quelque chose sans
// intermédiaire, quel que soit le service au bout.
//
// Ce n’est **pas** un canal d’authentification. Un code à six chiffres déposé
// dans une conversation se lit par tous ceux qui y sont ; le second facteur
// reste l’email (D9).

import { SECOND } from './durations.js'
import type { Environment } from './email/provider.js'
import type { Lead } from './leads.js'

export const WEBHOOK_VARIABLE = 'LEAD_WEBHOOK_URL'

// Même délai que le fournisseur d’email, et pour la même raison : la requête du
// visiteur attend cet appel, et une adresse qui ne répond jamais retiendrait sa
// connexion aussi longtemps.
const TIMEOUT = 10 * SECOND

export type Notifier = {
  /** L’hôte appelé, seule part de l’adresse qui puisse s’afficher. */
  readonly host: string
  send(lead: Lead): Promise<void>
}

/** L’adresse déclarée pour ce site. Vide, aucun webhook n’est monté. */
export function webhookUrl(environment: Environment): string {
  return (environment[WEBHOOK_VARIABLE] ?? '').trim()
}

/**
 * Monte le canal, ou lève si l’adresse n’en est pas une. Seul `https` est
 * accepté : le message part avec le nom, l’adresse et le texte du visiteur, et
 * les laisser traverser en clair les donnerait à qui écoute.
 */
export function webhookNotifier(url: string): Notifier {
  const target = parse(url)

  return {
    host: target.host,

    async send(lead: Lead): Promise<void> {
      const response = await fetch(target, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT),
        // Une redirection mènerait ailleurs que là où le client a consenti à
        // envoyer ses messages : elle est refusée plutôt que suivie.
        redirect: 'error',
        body: JSON.stringify(payload(lead)),
      })

      if (!response.ok) {
        throw new Error(
          `L’adresse de notification a refusé l’appel (${response.status}) : ${(await response.text()).slice(0, 200)}`,
        )
      }
    },
  }
}

export type WebhookPayload = {
  readonly text: string
  readonly content: string
  readonly name: string
  readonly email: string
  readonly message: string
  readonly page: string
  readonly language: string
  readonly at: number
}

/** Ce que l’adresse reçoit. `content` double `text` : voir l’en-tête. */
export function payload(lead: Lead): WebhookPayload {
  const said = describe(lead)

  return {
    text: said,
    content: said,
    name: lead.name,
    email: lead.email,
    message: lead.message,
    page: lead.page,
    language: lead.language,
    at: lead.at,
  }
}

/**
 * Ce que `basalte doctor` envoie pour de bon. Une adresse bien formée mais
 * morte passe un contrôle de forme, et ne se découvre alors qu’au premier
 * message perdu — la même raison qui fait envoyer un vrai email (D30).
 */
export function proofLead(siteName: string, now: number): Lead {
  return {
    id: 0,
    at: now,
    name: 'basalte doctor',
    email: 'doctor@basalte',
    message: `Ceci est l’appel de vérification de ${siteName}. Si vous le lisez, les messages du formulaire arriveront ici.`,
    page: '/',
    language: '',
    ip: '',
    agent: '',
    delivery: 'skipped',
  }
}

function describe(lead: Lead): string {
  return [
    `${lead.name} (${lead.email}) vous écrit depuis ${lead.page}`,
    '',
    lead.message,
  ].join('\n')
}

function parse(url: string): URL {
  let target: URL

  try {
    target = new URL(url)
  } catch {
    throw new Error(
      `« ${url} » n’est pas une adresse : renseigne ${WEBHOOK_VARIABLE} avec une URL complète.`,
    )
  }

  if (target.protocol !== 'https:') {
    throw new Error(
      `${WEBHOOK_VARIABLE} doit être en https : un message y passe avec le nom et l’adresse du visiteur.`,
    )
  }

  return target
}
