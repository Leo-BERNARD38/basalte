// Le compte éditeur : sa création, son mot de passe, et le verrouillage
// progressif qui suit les échecs.
//
// Le verrouillage est temporaire et plafonné. Il gêne l’attaquant sans jamais
// enfermer le client dehors durablement — et le site public, lui, reste servi
// quoi qu’il arrive (`securite.md`).

import type { DatabaseSync } from 'node:sqlite'

import { number, text, type Row } from './database.js'
import { HOUR, MINUTE } from './durations.js'
import {
  checkPassword,
  generatePassword,
  hashPassword,
  verifyPassword,
} from './password.js'

export const LOCK_AFTER = 5
export const LOCK_STEPS: readonly number[] = [
  MINUTE,
  5 * MINUTE,
  15 * MINUTE,
  HOUR,
]

export type Account = {
  readonly id: number
  readonly email: string
  readonly passwordHash: string
  readonly createdAt: number
  readonly passwordChangedAt: number
  readonly failures: number
  readonly lockedUntil: number
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function createAccount(
  database: DatabaseSync,
  email: string,
  now: number,
  password: string = generatePassword(),
): Promise<{ readonly account: Account; readonly password: string }> {
  const address = normalizeEmail(email)

  if (!address.includes('@')) {
    throw new Error(`« ${email} » n’est pas une adresse email.`)
  }

  if (findAccount(database, address) !== undefined) {
    throw new Error(`Un compte existe déjà pour « ${address} ».`)
  }

  const refusal = checkPassword(password)

  if (refusal !== undefined) throw new Error(refusal)

  database
    .prepare(
      `insert into account (email, password_hash, created_at, password_changed_at)
       values (?, ?, ?, ?)`,
    )
    .run(address, await hashPassword(password), now, now)

  const account = findAccount(database, address)

  if (account === undefined) {
    throw new Error('Le compte n’a pas pu être créé.')
  }

  return { account, password }
}

export function findAccount(
  database: DatabaseSync,
  email: string,
): Account | undefined {
  const row: Row | undefined = database
    .prepare('select * from account where email = ?')
    .get(normalizeEmail(email))

  return row === undefined ? undefined : toAccount(row)
}

export function accountById(
  database: DatabaseSync,
  id: number,
): Account | undefined {
  const row: Row | undefined = database
    .prepare('select * from account where id = ?')
    .get(id)

  return row === undefined ? undefined : toAccount(row)
}

export async function changePassword(
  database: DatabaseSync,
  account: Account,
  current: string,
  next: string,
  now: number,
): Promise<void> {
  if (!(await verifyPassword(account.passwordHash, current))) {
    throw new Error('Le mot de passe actuel ne correspond pas.')
  }

  const refusal = checkPassword(next)

  if (refusal !== undefined) throw new Error(refusal)

  database
    .prepare(
      'update account set password_hash = ?, password_changed_at = ? where id = ?',
    )
    .run(await hashPassword(next), now, account.id)
}

/**
 * Repose un mot de passe sans demander l’ancien, et rend celui qu’il faut
 * dicter. Réservé à la console : c’est la seule voie pour un client qui a
 * oublié le sien, `changePassword` exigeant un mot de passe que, justement, il
 * n’a plus. Aucune route ne l’expose — l’ouvrir au réseau ferait de l’accès à
 * la boîte email un accès au compte, alors que l’email n’est qu’un facteur.
 */
export async function resetPassword(
  database: DatabaseSync,
  account: Account,
  now: number,
  password: string = generatePassword(),
): Promise<string> {
  const refusal = checkPassword(password)

  if (refusal !== undefined) throw new Error(refusal)

  database
    .prepare(
      'update account set password_hash = ?, password_changed_at = ?, failures = 0, locked_until = 0 where id = ?',
    )
    .run(await hashPassword(password), now, account.id)

  return password
}

/** Renvoie la date jusqu’à laquelle le compte est bloqué, ou `0`. */
export function registerFailure(
  database: DatabaseSync,
  account: Account,
  now: number,
): number {
  const failures = account.failures + 1
  const step = failures - LOCK_AFTER
  const lockedUntil =
    step < 0
      ? 0
      : now + (LOCK_STEPS[Math.min(step, LOCK_STEPS.length - 1)] ?? 0)

  database
    .prepare('update account set failures = ?, locked_until = ? where id = ?')
    .run(failures, lockedUntil, account.id)

  return lockedUntil
}

export function clearFailures(database: DatabaseSync, account: Account): void {
  database
    .prepare('update account set failures = 0, locked_until = 0 where id = ?')
    .run(account.id)
}

function toAccount(row: Row): Account {
  return {
    id: number(row, 'id'),
    email: text(row, 'email'),
    passwordHash: text(row, 'password_hash'),
    createdAt: number(row, 'created_at'),
    passwordChangedAt: number(row, 'password_changed_at'),
    failures: number(row, 'failures'),
    lockedUntil: number(row, 'locked_until'),
  }
}
