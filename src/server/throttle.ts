// La limitation de débit : un compteur par fenêtre fixe, dans la base.
//
// Une fenêtre fixe laisse passer jusqu’à deux fois la limite à cheval sur une
// bordure. C’est assumé : ce qui compte ici est de ramener un million
// d’essais à quelques dizaines, pas de tenir un débit à l’unité près — et une
// fenêtre glissante coûterait une ligne par tentative au lieu d’une par
// fenêtre.

import type { DatabaseSync } from 'node:sqlite'

import { number, type Row } from './database.js'
import { MINUTE } from './durations.js'

export type Rule = {
  readonly limit: number
  readonly window: number
}

/** Les trois compteurs du flux de connexion. */
export const RULES = {
  /** Essais de mot de passe depuis une même adresse. */
  address: { limit: 20, window: 15 * MINUTE },
  /** Essais de mot de passe sur un même compte, toutes adresses confondues. */
  account: { limit: 10, window: 15 * MINUTE },
  /** Envois de code par email — `panel.md` : trois par quart d’heure. */
  code: { limit: 3, window: 15 * MINUTE },
} as const satisfies Record<string, Rule>

export type Allowance = {
  readonly allowed: boolean
  /** Date à laquelle la fenêtre en cours se referme. */
  readonly retryAt: number
}

export function consume(
  database: DatabaseSync,
  bucket: string,
  key: string,
  rule: Rule,
  now: number,
): Allowance {
  const start = Math.floor(now / rule.window) * rule.window
  const retryAt = start + rule.window

  const row: Row | undefined = database
    .prepare(
      'select count from throttle where bucket = ? and key = ? and window_start = ?',
    )
    .get(bucket, key, start)

  const used = row === undefined ? 0 : number(row, 'count')

  if (used >= rule.limit) return { allowed: false, retryAt }

  database
    .prepare(
      `insert into throttle (bucket, key, window_start, count)
       values (?, ?, ?, 1)
       on conflict (bucket, key, window_start)
       do update set count = count + 1`,
    )
    .run(bucket, key, start)

  return { allowed: true, retryAt }
}

export function pruneThrottle(database: DatabaseSync, before: number): void {
  database.prepare('delete from throttle where window_start < ?').run(before)
}
