// Les sondes de `basalte doctor`. Chacune **prouve** au lieu de vérifier : un
// email part vraiment, le DNS est vraiment résolu, le dépôt est vraiment
// interrogé en écriture (D30). Un contrôle de forme laisserait passer une clé
// présente mais fausse, qui ne se découvre que le jour où le client ne peut
// plus se connecter.
//
// Elles sont injectables — résolution DNS, envoi, exécution — parce qu’une
// preuve qu’on ne peut pas éprouver n’en est pas une.

import { statfs } from 'node:fs/promises'
import os from 'node:os'

import type { Level } from '../cli/args.js'
import { brevoProvider } from '../server/email/brevo.js'
import {
  dkimHost,
  dmarcHost,
  providerDns,
  readDkim,
  readDmarc,
  readSpf,
  sendingDomains,
  type ProviderDns,
} from '../server/email/dns.js'
import { configurationProof } from '../server/email/messages.js'
import {
  adminAddress,
  contactAddress,
  describeMissing,
  readSettings,
  VARIABLES,
  type Environment,
} from '../server/email/provider.js'
import { hasUpstream } from '../publish/remote.js'
import { tryGit } from '../server/git.js'
import {
  proofLead,
  webhookNotifier,
  webhookUrl,
  WEBHOOK_VARIABLE,
} from '../server/webhook.js'
import type { Site } from '../site/define.js'

export const MINIMUM_MEMORY = 2 * 1024 ** 3
export const MINIMUM_DISK = 5 * 1024 ** 3

export type Probe = {
  readonly label: string
  readonly level: Level
  readonly detail: string
  /** Ce qu’il faut faire, quand la sonde a échoué. */
  readonly fix?: string
}

export type Diagnosis = {
  readonly root: string
  readonly site: Site
  readonly environment: Environment
  /** L’adresse attendue derrière le domaine, quand `--host` la donne. */
  readonly host?: string
  /** Envoie réellement les preuves : l’email, et l’appel de notification. */
  readonly send: boolean
  resolve(domain: string): Promise<readonly string[]>
  /** Les enregistrements TXT d’un nom, fragments joints. */
  resolveText(name: string): Promise<readonly string[]>
}

export async function diagnose(target: Diagnosis): Promise<readonly Probe[]> {
  return [
    configuration(target),
    ...channels(target),
    await email(target),
    await notification(target),
    await dns(target),
    ...(await deliverability(target)),
    await repository(target),
    await resources(target),
  ]
}

function configuration(target: Diagnosis): Probe {
  const languages = target.site.languages
  const draft = languages.draft.map((language) => language.code)

  return {
    label: 'site.config.ts',
    level: 'ok',
    detail: `« ${target.site.name} » sur ${target.site.domain} — ${languages.onlineCodes.join(', ')} en ligne${draft.length === 0 ? '' : `, ${draft.join(', ')} en préparation`}`,
  }
}

// Sans `AUTH_EMAIL_*`, les codes de connexion empruntent le canal du
// formulaire : un robot qui épuise le quota enferme alors le client dehors.
function channels(target: Diagnosis): readonly Probe[] {
  const provider = target.site.email?.provider ?? 'brevo'
  const auth = readSettings(target.environment, provider, target.site.name)
  const site = readSettings(
    target.environment,
    provider,
    target.site.name,
    'site',
  )
  const probes: Probe[] = []

  const missing = describeMissing(site)

  probes.push(
    missing === undefined
      ? { label: '.env', level: 'ok', detail: `canal du site — ${site.from}` }
      : {
          label: '.env',
          level: 'error',
          detail: missing,
          fix: 'renseigne les variables dans le .env du dépôt, puis relance.',
        },
  )

  // Deux clés vides ne sont pas deux clés partagées : le `.env` au-dessus dit
  // déjà qu’il n’y en a aucune, et le répéter noierait ce qu’il faut corriger.
  if (site.key !== '') {
    probes.push(
      auth.key === site.key
        ? {
            label: 'canaux email',
            level: 'warning',
            detail: 'les codes de connexion partagent la clé du formulaire',
            fix: `renseigne ${VARIABLES.authKey} et ${VARIABLES.authFrom} pour qu’un robot ne puisse pas épuiser le quota qui sert à se connecter.`,
          }
        : {
            label: 'canaux email',
            level: 'ok',
            detail: 'deux clés distinctes',
          },
    )
  }

  probes.push(...addresses(target))

  return probes
}

// Une adresse de contact absente n’est un manque que si le site déclare
// notifier ses messages : sans la capacité, l’absence est le réglage, et un
// avertissement dirait le contraire de ce qui a été décidé.
//
// Reste le cas que rien ne disait, et que la capacité rend muet : le site a
// coupé l’email et n’a déclaré aucune adresse de notification. Personne n’est
// alors prévenu, et deux lignes plus haut disent « sans objet » — d’où celle-ci,
// qui ne paraît que là. Répéter l’avertissement quand la ligne voisine le porte
// déjà noierait ce qu’il faut corriger, comme pour les canaux email.
function addresses(target: Diagnosis): readonly Probe[] {
  const admin = adminAddress(target.environment)
  const contact = contactAddress(target.environment)
  const notifies = target.site.capabilities.notifyLeads
  const elsewhere = webhookUrl(target.environment) !== ''

  return [
    ...(notifies || elsewhere
      ? []
      : [
          {
            label: 'canal des messages',
            level: 'warning' as Level,
            detail:
              'aucun — un message resterait dans le panel, sans que rien ne le dise',
            fix: `renseigne ${WEBHOOK_VARIABLE} avec l’adresse d’un service que le client consulte, ou rallume « notifyLeads ».`,
          },
        ]),
    contact === ''
      ? notifies
        ? {
            label: VARIABLES.contact,
            level: 'warning',
            detail:
              'absent — un message resterait dans le panel sans être notifié',
            fix: `renseigne ${VARIABLES.contact} avec l’adresse du client, ou ${WEBHOOK_VARIABLE} avec un service qu’il consulte.`,
          }
        : {
            label: VARIABLES.contact,
            level: 'ok',
            detail: elsewhere
              ? 'sans objet — ce site prévient ailleurs que par email'
              : 'sans objet — ce site ne notifie pas ses messages',
          }
      : { label: VARIABLES.contact, level: 'ok', detail: contact },
    admin === ''
      ? {
          label: VARIABLES.admin,
          level: 'warning',
          detail: 'absent — les pannes de la machine ne partiraient nulle part',
          fix: `renseigne ${VARIABLES.admin} avec ton adresse.`,
        }
      : { label: VARIABLES.admin, level: 'ok', detail: admin },
  ]
}

async function email(target: Diagnosis): Promise<Probe> {
  const provider = target.site.email?.provider ?? 'brevo'
  const settings = readSettings(
    target.environment,
    provider,
    target.site.name,
    'site',
  )
  const to = adminAddress(target.environment)
  const letter = configurationProof(target.site.name, 'site')

  if (describeMissing(settings) !== undefined || to === '') {
    return {
      label: 'email',
      level: 'warning',
      detail: 'non éprouvé — la lettre se compose, mais rien ne peut partir',
    }
  }

  if (!target.send) {
    return {
      label: 'email',
      level: 'warning',
      detail: `envoi sauté par « --no-email » — la lettre fait ${letter.text.length} caractères`,
    }
  }

  try {
    await brevoProvider(settings).send({ ...letter, to })

    return {
      label: 'email',
      level: 'ok',
      detail: `envoyé à ${to}, accepté par ${provider}`,
    }
  } catch (cause) {
    return {
      label: 'email',
      level: 'error',
      detail: (cause as Error).message,
      fix: `vérifie ${VARIABLES.key} et ${VARIABLES.from} dans le .env.`,
    }
  }
}

// L’adresse de notification est éprouvée comme l’email : par un appel réel.
// Une adresse bien formée mais morte passe tous les contrôles de forme, et ne
// se découvre qu’au premier message perdu (D30).
async function notification(target: Diagnosis): Promise<Probe> {
  const url = webhookUrl(target.environment)

  if (url === '') {
    return {
      label: WEBHOOK_VARIABLE,
      level: 'ok',
      detail: 'sans objet — ce site ne prévient personne hors email',
    }
  }

  let notifier

  try {
    notifier = webhookNotifier(url)
  } catch (cause) {
    return {
      label: WEBHOOK_VARIABLE,
      level: 'error',
      detail: (cause as Error).message,
      fix: `corrige ${WEBHOOK_VARIABLE} dans le .env, puis relance.`,
    }
  }

  if (!target.send) {
    return {
      label: WEBHOOK_VARIABLE,
      level: 'warning',
      detail: `appel sauté par « --no-email » — l’adresse mène à ${notifier.host}`,
    }
  }

  try {
    await notifier.send(proofLead(target.site.name, Date.now()))

    return {
      label: WEBHOOK_VARIABLE,
      level: 'ok',
      detail: `appelée, acceptée par ${notifier.host}`,
    }
  } catch (cause) {
    return {
      label: WEBHOOK_VARIABLE,
      level: 'error',
      detail: (cause as Error).message,
      fix: `vérifie ${WEBHOOK_VARIABLE} : l’adresse doit accepter un POST JSON.`,
    }
  }
}

// SPF, DKIM et DMARC, sur le domaine qui expédie. Ce qui **refuse** est DKIM :
// Brevo expédie sous son propre domaine d’enveloppe, si bien que le SPF du
// client n’est jamais aligné et que sa signature est la seule authentification
// qui reste. Sans elle, un code de connexion tombe en spam, et le client est
// dehors — c’est une panne, pas un détail.
//
// Le SPF et le DMARC avertissent : le premier ne conditionne rien chez ce
// fournisseur, le second ne fait pas arriver un email, il dit quoi faire des
// faux. Aucun des deux ne mérite d’empêcher une mise en ligne.
async function deliverability(target: Diagnosis): Promise<readonly Probe[]> {
  const domains = sendingDomains(target.environment)

  if (domains.length === 0) return []

  const expected = providerDns(target.site.email?.provider ?? 'brevo')
  const probes: Probe[] = []

  for (const domain of domains) {
    probes.push(await spf(target, domain, expected))
    probes.push(await dkim(target, domain, expected))
    probes.push(await dmarc(target, domain))
  }

  return probes
}

async function spf(
  target: Diagnosis,
  domain: string,
  expected: ProviderDns | undefined,
): Promise<Probe> {
  const label = `SPF (${domain})`
  const verdict = readSpf(await text(target, domain), expected)

  if (verdict.kind === 'absent') {
    return {
      label,
      level: 'warning',
      detail: 'aucun enregistrement — le domaine est moins bien reçu partout',
      fix: `ajoute un TXT sur ${domain} : « v=spf1 ${expected?.spf === undefined ? '' : `include:${expected.spf} `}~all ».`,
    }
  }

  const unnamed =
    verdict.names || expected?.spf === undefined
      ? ''
      : ' — le fournisseur n’y est pas nommé, ce qu’il ne demande pas'

  return { label, level: 'ok', detail: `${verdict.record}${unnamed}` }
}

async function dkim(
  target: Diagnosis,
  domain: string,
  expected: ProviderDns | undefined,
): Promise<Probe> {
  const label = `DKIM (${domain})`
  const declared = target.site.email?.dkim
  const selectors = declared ?? expected?.dkimSelectors ?? []

  if (selectors.length === 0) {
    return {
      label,
      level: 'warning',
      detail:
        'non éprouvé — le socle ne connaît pas les sélecteurs de ce fournisseur',
      fix: 'déclare-les dans site.config.ts, sous « email: { dkim: [...] } ».',
    }
  }

  for (const selector of selectors) {
    if (readDkim(await text(target, dkimHost(domain, selector)))) {
      return { label, level: 'ok', detail: `signé par « ${selector} »` }
    }
  }

  return {
    label,
    level: 'error',
    detail: `aucune clé sur ${selectors.map((entry) => `« ${entry} »`).join(', ')} — les emails partent sans signature`,
    fix: declared
      ? `publie la clé DKIM sur ${dkimHost(domain, selectors[0] ?? '')}, puis relance.`
      : 'publie les enregistrements que ton fournisseur affiche ; si son sélecteur diffère, déclare-le dans site.config.ts, sous « email: { dkim: [...] } ».',
  }
}

async function dmarc(target: Diagnosis, domain: string): Promise<Probe> {
  const label = `DMARC (${domain})`
  const verdict = readDmarc(await text(target, dmarcHost(domain)))
  const admin = adminAddress(target.environment)

  return verdict.kind === 'absent'
    ? {
        label,
        level: 'warning',
        detail: 'absent — rien ne dit aux boîtes quoi faire d’un faux',
        fix: `ajoute un TXT sur ${dmarcHost(domain)} : « v=DMARC1; p=none; rua=mailto:${admin === '' ? 'toi@exemple.fr' : admin} ».`,
      }
    : { label, level: 'ok', detail: `politique « ${verdict.policy} »` }
}

// Un nom sans enregistrement lève au lieu de rendre une liste vide : les deux
// veulent dire la même chose ici, et une sonde n’a pas à distinguer un domaine
// muet d’un domaine absent.
async function text(
  target: Diagnosis,
  name: string,
): Promise<readonly string[]> {
  try {
    return await target.resolveText(name)
  } catch {
    return []
  }
}

async function dns(target: Diagnosis): Promise<Probe> {
  const domain = target.site.domain

  try {
    const found = await target.resolve(domain)

    if (target.host === undefined) {
      return {
        label: 'DNS',
        level: 'ok',
        detail: `${domain} → ${found.join(', ')}`,
      }
    }

    return found.includes(target.host)
      ? { label: 'DNS', level: 'ok', detail: `${domain} → ${target.host}` }
      : {
          label: 'DNS',
          level: 'error',
          detail: `${domain} pointe vers ${found.join(', ')}, la machine est en ${target.host}`,
          fix: 'corrige l’enregistrement A chez le registrar, puis relance.',
        }
  } catch {
    return {
      label: 'DNS',
      level: 'error',
      detail: `${domain} ne se résout pas`,
      fix: 'crée l’enregistrement A vers la machine, puis relance.',
    }
  }
}

async function repository(target: Diagnosis): Promise<Probe> {
  if (!(await hasUpstream(target.root))) {
    return {
      label: 'dépôt git',
      level: 'error',
      detail: 'aucune branche distante suivie',
      fix: 'crée le dépôt sur GitHub, puis « git push --set-upstream origin main ».',
    }
  }

  const pushed = await tryGit(target.root, ['push', '--dry-run'])

  return pushed.kind === 'done'
    ? { label: 'dépôt git', level: 'ok', detail: 'joignable en écriture' }
    : {
        label: 'dépôt git',
        level: 'error',
        detail: pushed.detail,
        fix: 'vérifie la clé de déploiement et la protection de branche.',
      }
}

async function resources(target: Diagnosis): Promise<Probe> {
  const memory = os.totalmem()
  const free = await freeBytes(target.root)
  const detail = `${gigabytes(memory)} Go de RAM, ${gigabytes(free)} Go libres`

  return memory >= MINIMUM_MEMORY && free >= MINIMUM_DISK
    ? { label: 'ressources', level: 'ok', detail }
    : {
        label: 'ressources',
        level: 'warning',
        detail,
        fix: 'un build Astro demande 2 Go de RAM et quelques Go de disque.',
      }
}

/** L’espace du volume qui porte le dépôt, seul concerné par un build. */
async function freeBytes(root: string): Promise<number> {
  try {
    const stats = await statfs(root)

    return stats.bsize * stats.bavail
  } catch {
    return 0
  }
}

function gigabytes(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1)
}
