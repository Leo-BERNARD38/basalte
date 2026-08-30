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
  /** Envoie réellement l’email de preuve. */
  readonly send: boolean
  resolve(domain: string): Promise<readonly string[]>
}

export async function diagnose(target: Diagnosis): Promise<readonly Probe[]> {
  return [
    configuration(target),
    ...channels(target),
    await email(target),
    await dns(target),
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
function addresses(target: Diagnosis): readonly Probe[] {
  const admin = adminAddress(target.environment)
  const contact = contactAddress(target.environment)
  const notifies = target.site.capabilities.notifyLeads

  return [
    contact === ''
      ? notifies
        ? {
            label: VARIABLES.contact,
            level: 'warning',
            detail:
              'absent — un message resterait dans le panel sans être notifié',
            fix: `renseigne ${VARIABLES.contact} avec l’adresse du client.`,
          }
        : {
            label: VARIABLES.contact,
            level: 'ok',
            detail: 'sans objet — ce site ne notifie pas ses messages',
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
