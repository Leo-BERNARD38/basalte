// Les mises en ligne, gardées en base. Le panel y lit ce qu’il affiche en
// permanence — quand le site est sorti pour la dernière fois, et si quelque
// chose a échoué depuis.
//
// Seuls les états terminaux sont écrits. Une publication en cours vit dans la
// file d’attente, en mémoire : une ligne « en cours » survivrait à un
// redémarrage et mentirait pour toujours.

import type { DatabaseSync } from 'node:sqlite'

import { maybeNumber, number, text, type Row } from '../server/database.js'

export type Outcome = 'published' | 'failed'

/** Ce qu’est devenu le dépôt distant : reçu, absent, ou en échec. */
export type Remote = 'pushed' | 'absent' | 'failed'

export type Publication = {
  readonly id: number
  readonly accountId?: number
  readonly email: string
  readonly at: number
  readonly outcome: Outcome
  /** Le nom de la version mise en ligne, absent en cas d’échec. */
  readonly release?: string
  readonly remote: Remote
  /** L’erreur complète, pour le mainteneur ; jamais montrée au client. */
  readonly detail: string
  readonly duration: number
}

export type NewPublication = Omit<Publication, 'id'>

export function recordPublication(
  database: DatabaseSync,
  entry: NewPublication,
): void {
  database
    .prepare(
      `insert into publication
         (account_id, email, at, outcome, release, remote, detail, duration)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.accountId ?? null,
      entry.email,
      entry.at,
      entry.outcome,
      entry.release ?? null,
      entry.remote,
      entry.detail,
      entry.duration,
    )
}

export function lastPublication(
  database: DatabaseSync,
): Publication | undefined {
  const row: Row | undefined = database
    .prepare('select * from publication order by at desc, id desc limit 1')
    .get()

  return row === undefined ? undefined : toPublication(row)
}

export function recentPublications(
  database: DatabaseSync,
  limit: number,
): readonly Publication[] {
  return database
    .prepare('select * from publication order by at desc, id desc limit ?')
    .all(limit)
    .map((row) => toPublication(row))
}

function toPublication(row: Row): Publication {
  const accountId = maybeNumber(row, 'account_id')
  const release = row['release']

  return {
    id: number(row, 'id'),
    ...(accountId === undefined ? {} : { accountId }),
    email: text(row, 'email'),
    at: number(row, 'at'),
    outcome: text(row, 'outcome') as Outcome,
    ...(typeof release === 'string' ? { release } : {}),
    remote: text(row, 'remote') as Remote,
    detail: text(row, 'detail'),
    duration: number(row, 'duration'),
  }
}
