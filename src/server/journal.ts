// Le journal de connexion : ce que le client lit dans la page « Compte ».
//
// Il porte une donnée personnelle — l’adresse IP — et relève donc de la même
// purge que les leads et les logs d’accès (`services.md`).

import type { DatabaseSync } from 'node:sqlite'

import { number, text, type Row } from './database.js'

export type Outcome =
  | 'password-rejected'
  | 'code-sent'
  | 'code-rejected'
  | 'signed-in'
  | 'signed-out'
  | 'locked'
  | 'throttled'
  | 'rescued'
  | 'device-trusted'
  | 'devices-revoked'
  | 'password-changed'

export const OUTCOME_LABELS: Readonly<Record<Outcome, string>> = {
  'password-rejected': 'mot de passe refusé',
  'code-sent': 'code envoyé',
  'code-rejected': 'code refusé',
  'signed-in': 'connexion',
  'signed-out': 'déconnexion',
  locked: 'compte bloqué un moment',
  throttled: 'trop de tentatives',
  rescued: 'connexion par lien de secours',
  'device-trusted': 'nouvel appareil reconnu',
  'devices-revoked': 'appareils oubliés',
  'password-changed': 'mot de passe modifié',
}

export type JournalEntry = {
  readonly accountId?: number
  readonly email: string
  readonly at: number
  readonly outcome: Outcome
  readonly ip: string
  readonly agent: string
}

export function record(database: DatabaseSync, entry: JournalEntry): void {
  database
    .prepare(
      `insert into journal (account_id, email, at, outcome, ip, agent)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.accountId ?? null,
      entry.email,
      entry.at,
      entry.outcome,
      entry.ip,
      entry.agent,
    )
}

export function recentEntries(
  database: DatabaseSync,
  accountId: number,
  limit: number,
): readonly JournalEntry[] {
  return database
    .prepare(
      'select * from journal where account_id = ? order by at desc, id desc limit ?',
    )
    .all(accountId, limit)
    .map((row) => toEntry(row))
}

export function countSince(
  database: DatabaseSync,
  accountId: number,
  outcome: Outcome,
  since: number,
): number {
  const row: Row | undefined = database
    .prepare(
      'select count(*) as total from journal where account_id = ? and outcome = ? and at >= ?',
    )
    .get(accountId, outcome, since)

  return row === undefined ? 0 : number(row, 'total')
}

export function purgeJournal(database: DatabaseSync, before: number): number {
  return Number(
    database.prepare('delete from journal where at < ?').run(before).changes,
  )
}

function toEntry(row: Row): JournalEntry {
  const accountId = row['account_id']

  return {
    ...(typeof accountId === 'number' ? { accountId } : {}),
    email: text(row, 'email'),
    at: number(row, 'at'),
    outcome: text(row, 'outcome') as Outcome,
    ip: text(row, 'ip'),
    agent: text(row, 'agent'),
  }
}
