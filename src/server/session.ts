// Les sessions du panel. Le navigateur porte un jeton de 256 bits ; la base
// n’en garde que l’empreinte, si bien qu’une copie de la base ne permet de se
// connecter nulle part.
//
// Deux durées, et la plus courte des deux gagne : douze heures sans activité,
// sept jours en tout.

import type { DatabaseSync } from 'node:sqlite'

import { maybeNumber, number, text, type Row } from './database.js'
import { DAY, HOUR } from './durations.js'
import { fingerprint, newToken } from './secrets.js'

export const INACTIVITY = 12 * HOUR
export const LIFETIME = 7 * DAY

export type Origin = {
  readonly ip: string
  readonly agent: string
}

export type Session = {
  readonly id: number
  readonly accountId: number
  readonly createdAt: number
  readonly seenAt: number
  readonly expiresAt: number
  readonly ip: string
  readonly agent: string
}

export type OpenedSession = {
  readonly token: string
  readonly expiresAt: number
}

export function openSession(
  database: DatabaseSync,
  accountId: number,
  origin: Origin,
  now: number,
): OpenedSession {
  const token = newToken()
  const expiresAt = now + LIFETIME

  database
    .prepare(
      `insert into session (account_id, token_hash, created_at, seen_at, expires_at, ip, agent)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      accountId,
      fingerprint(token),
      now,
      now,
      expiresAt,
      origin.ip,
      origin.agent,
    )

  return { token, expiresAt }
}

/** Valide le jeton et repousse l’inactivité, ou renvoie `undefined`. */
export function readSession(
  database: DatabaseSync,
  token: string,
  now: number,
): Session | undefined {
  const row: Row | undefined = database
    .prepare('select * from session where token_hash = ?')
    .get(fingerprint(token))

  if (row === undefined) return undefined

  const session = toSession(row)

  if (maybeNumber(row, 'revoked_at') !== undefined) return undefined
  if (now >= session.expiresAt) return undefined
  if (now - session.seenAt >= INACTIVITY) return undefined

  database
    .prepare('update session set seen_at = ? where id = ?')
    .run(now, session.id)

  return { ...session, seenAt: now }
}

export function closeSession(
  database: DatabaseSync,
  token: string,
  now: number,
): void {
  database
    .prepare(
      'update session set revoked_at = ? where token_hash = ? and revoked_at is null',
    )
    .run(now, fingerprint(token))
}

export function revokeSessions(
  database: DatabaseSync,
  accountId: number,
  now: number,
): number {
  return Number(
    database
      .prepare(
        'update session set revoked_at = ? where account_id = ? and revoked_at is null',
      )
      .run(now, accountId).changes,
  )
}

/** Coupe toutes les sessions du compte sauf celle qui demande. */
export function revokeOtherSessions(
  database: DatabaseSync,
  accountId: number,
  keep: string,
  now: number,
): number {
  return Number(
    database
      .prepare(
        `update session set revoked_at = ?
         where account_id = ? and revoked_at is null and token_hash <> ?`,
      )
      .run(now, accountId, fingerprint(keep)).changes,
  )
}

export function pruneSessions(database: DatabaseSync, now: number): void {
  database.prepare('delete from session where expires_at < ?').run(now)
}

function toSession(row: Row): Session {
  return {
    id: number(row, 'id'),
    accountId: number(row, 'account_id'),
    createdAt: number(row, 'created_at'),
    seenAt: number(row, 'seen_at'),
    expiresAt: number(row, 'expires_at'),
    ip: text(row, 'ip'),
    agent: text(row, 'agent'),
  }
}
