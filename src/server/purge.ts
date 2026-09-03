// La purge des données personnelles. Trois gisements, une seule durée
// (`securite.md`) : les messages du formulaire, le journal de connexion, et
// les logs d’accès de Caddy.
//
// Les deux premiers sont en base, et c’est ce module qui les efface. Le
// troisième appartient à Caddy, qui fait tourner ses fichiers lui-même : la
// durée s’y règle par `roll_keep_for`, dans le Caddyfile.
//
// C’est le processus du panel qui purge, une fois au démarrage puis chaque
// jour. Il tourne déjà en permanence, là où un cron dans le conteneur serait un
// composant de plus à provisionner et à surveiller. Une machine éteinte ne
// purge pas ; elle rattrape au démarrage suivant, ce qui suffit à une durée qui
// se compte en mois.
//
// Le décompte est en mois calendaires, jamais en tranches de trente jours :
// « douze mois » doit vouloir dire la même date l’an prochain. Il se fait en
// temps universel, pour que deux machines aux fuseaux différents purgent la
// même chose.

import type { DatabaseSync } from 'node:sqlite'

import { DAY } from './durations.js'
import { purgeJournal } from './journal.js'
import { purgeLeads } from './leads.js'
import { pruneSessions } from './session.js'
import { pruneThrottle } from './throttle.js'

/** La durée de conservation par défaut, en mois (`services.md`). */
export const DEFAULT_MONTHS = 12

/** Les compteurs de débit ne servent qu’à la fenêtre en cours. */
export const THROTTLE_KEPT = DAY

export type Purged = {
  readonly leads: number
  readonly journal: number
}

export function purgeBefore(now: number, months: number): number {
  const date = new Date(now)
  const day = date.getUTCDate()

  // Le même jour du mois visé, ou son dernier jour quand il est plus court :
  // reculer d’un mois depuis le 31 ne doit pas retomber au 3 du mois courant,
  // ce qui effacerait trois jours avant la date promise.
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() - months)

  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate()

  date.setUTCDate(Math.min(day, last))

  return date.getTime()
}

export function purgeNow(
  database: DatabaseSync,
  months: number,
  now: number,
): Purged {
  const before = purgeBefore(now, months)

  const purged = {
    leads: purgeLeads(database, before),
    journal: purgeJournal(database, before),
  }

  pruneThrottle(database, now - THROTTLE_KEPT)
  pruneSessions(database, now)
  pruneCredentials(database, now)

  return purged
}

// Les tentatives, appareils et secours expirés portent la même adresse et le
// même navigateur qu’une session : ils s’effacent avec elle.
function pruneCredentials(database: DatabaseSync, now: number): void {
  for (const table of ['login_attempt', 'device', 'rescue']) {
    database.prepare(`delete from ${table} where expires_at < ?`).run(now)
  }
}

/**
 * Lance la purge et la reprogramme chaque jour. Le minuteur ne retient pas le
 * processus : il s’arrête avec lui, et la fonction rendue l’arrête à la main.
 */
export function startPurge(parts: {
  readonly database: DatabaseSync
  readonly months: number
  readonly now: () => number
}): () => void {
  const run = (): void => {
    try {
      purgeNow(parts.database, parts.months, parts.now())
    } catch (cause) {
      process.stderr.write(
        `La purge n’a pas abouti : ${(cause as Error).message}\n`,
      )
    }
  }

  run()

  const timer = setInterval(run, DAY)

  timer.unref()

  return () => {
    clearInterval(timer)
  }
}
