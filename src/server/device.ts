// L’appareil de confiance : trente jours pendant lesquels le code par email
// n’est plus demandé sur ce navigateur.
//
// C’est le seul assouplissement du second facteur, et il est borné : le jeton
// expire, il se révoque en bloc, et sa création prévient le client par email.

import type { DatabaseSync } from 'node:sqlite'

import { maybeNumber, number, text, type Row } from './database.js'
import { DAY } from './durations.js'
import { fingerprint, newToken } from './secrets.js'
import type { Origin } from './session.js'

export const TRUST = 30 * DAY

export type Device = {
  readonly id: number
  readonly accountId: number
  readonly createdAt: number
  readonly expiresAt: number
  readonly ip: string
  readonly agent: string
}

export type TrustedDevice = {
  readonly token: string
  readonly expiresAt: number
}

export function trustDevice(
  database: DatabaseSync,
  accountId: number,
  origin: Origin,
  now: number,
): TrustedDevice {
  const token = newToken()
  const expiresAt = now + TRUST

  database
    .prepare(
      `insert into device (account_id, token_hash, created_at, expires_at, ip, agent)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(accountId, fingerprint(token), now, expiresAt, origin.ip, origin.agent)

  return { token, expiresAt }
}

export function findDevice(
  database: DatabaseSync,
  token: string,
  now: number,
): Device | undefined {
  const row: Row | undefined = database
    .prepare('select * from device where token_hash = ?')
    .get(fingerprint(token))

  if (row === undefined) return undefined
  if (maybeNumber(row, 'revoked_at') !== undefined) return undefined

  const device = toDevice(row)

  return now >= device.expiresAt ? undefined : device
}

export function listDevices(
  database: DatabaseSync,
  accountId: number,
  now: number,
): readonly Device[] {
  return database
    .prepare(
      `select * from device
       where account_id = ? and revoked_at is null and expires_at > ?
       order by created_at desc`,
    )
    .all(accountId, now)
    .map((row) => toDevice(row))
}

export function forgetDevices(
  database: DatabaseSync,
  accountId: number,
  now: number,
): number {
  return Number(
    database
      .prepare(
        'update device set revoked_at = ? where account_id = ? and revoked_at is null',
      )
      .run(now, accountId).changes,
  )
}

function toDevice(row: Row): Device {
  return {
    id: number(row, 'id'),
    accountId: number(row, 'account_id'),
    createdAt: number(row, 'created_at'),
    expiresAt: number(row, 'expires_at'),
    ip: text(row, 'ip'),
    agent: text(row, 'agent'),
  }
}
