// Le flux de connexion, du mot de passe à la session.
//
// Trois propriétés portent la sécurité de ce fichier :
//
// - le refus est le même mot pour mot que le compte existe ou non, et coûte le
//   même temps de calcul — l’écran ne dit jamais qui a un compte ici ;
// - le code est lié à la tentative en cours, pas au compte : le même code
//   présenté depuis une autre tentative ne vaut rien ;
// - la tentative est consommée avant que la session ne s’ouvre, si bien qu’une
//   interruption laisse au pire un client qui recommence, jamais un code
//   rejouable.

import {
  accountById,
  clearFailures,
  findAccount,
  normalizeEmail,
  registerFailure,
} from './account.js'
import type { Server } from './context.js'
import { maybeNumber, number, text, type Row } from './database.js'
import { findDevice, trustDevice } from './device.js'
import { MINUTE } from './durations.js'
import {
  deviceTrusted,
  repeatedFailures,
  signInCode,
  type Letter,
} from './email/messages.js'
import { countSince, record } from './journal.js'
import { burnTime, verifyPassword } from './password.js'
import {
  codeFingerprint,
  fingerprint,
  newCode,
  newToken,
  sameSecret,
} from './secrets.js'
import { openSession, type Origin } from './session.js'
import { consume, RULES } from './throttle.js'

export const CODE_LIFETIME = 10 * MINUTE
export const CODE_TRIES = 5
export const RESCUE_LIFETIME = 10 * MINUTE
export const NOTICE_AFTER = 5
export const NOTICE_WINDOW = 60 * MINUTE

const REFUSED = 'Adresse ou mot de passe incorrect.'
const STALE = 'Cette connexion n’est plus valable. Recommencez depuis le début.'

export type SignInResult =
  | {
      readonly kind: 'code-sent'
      readonly attempt: string
      readonly expiresAt: number
    }
  | {
      readonly kind: 'signed-in'
      readonly session: string
      readonly expiresAt: number
    }
  | {
      readonly kind: 'refused'
      readonly message: string
      readonly retryAt?: number
    }

export type CodeResult =
  | {
      readonly kind: 'signed-in'
      readonly session: string
      readonly expiresAt: number
      readonly device?: { readonly token: string; readonly expiresAt: number }
    }
  | {
      readonly kind: 'refused'
      readonly message: string
      readonly remaining?: number
    }

export type RescueResult =
  | {
      readonly kind: 'signed-in'
      readonly session: string
      readonly expiresAt: number
    }
  | { readonly kind: 'refused'; readonly message: string }

export async function signIn(
  server: Server,
  input: {
    readonly email: string
    readonly password: string
    readonly device?: string
    readonly origin: Origin
  },
): Promise<SignInResult> {
  const now = server.now()
  const email = normalizeEmail(input.email)

  const byAddress = consume(
    server.database,
    'address',
    input.origin.ip,
    RULES.address,
    now,
  )

  if (!byAddress.allowed) {
    record(server.database, {
      email,
      at: now,
      outcome: 'throttled',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    return tooMany(byAddress.retryAt)
  }

  const account = findAccount(server.database, email)

  if (account === undefined) {
    await burnTime(input.password)

    record(server.database, {
      email,
      at: now,
      outcome: 'password-rejected',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    return { kind: 'refused', message: REFUSED }
  }

  const byAccount = consume(
    server.database,
    'account',
    email,
    RULES.account,
    now,
  )

  if (!byAccount.allowed) {
    record(server.database, {
      accountId: account.id,
      email,
      at: now,
      outcome: 'throttled',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    return tooMany(byAccount.retryAt)
  }

  if (now < account.lockedUntil) {
    record(server.database, {
      accountId: account.id,
      email,
      at: now,
      outcome: 'locked',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    return {
      kind: 'refused',
      retryAt: account.lockedUntil,
      message:
        'Trop d’essais : la connexion est bloquée quelques minutes. Réessayez plus tard.',
    }
  }

  if (!(await verifyPassword(account.passwordHash, input.password))) {
    registerFailure(server.database, account, now)

    record(server.database, {
      accountId: account.id,
      email,
      at: now,
      outcome: 'password-rejected',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    const failures = countSince(
      server.database,
      account.id,
      'password-rejected',
      now - NOTICE_WINDOW,
    )

    if (failures === NOTICE_AFTER) {
      await deliver(server, account.email, () =>
        repeatedFailures(server.site.name, failures, input.origin),
      )
    }

    return { kind: 'refused', message: REFUSED }
  }

  clearFailures(server.database, account)

  if (
    input.device !== undefined &&
    findDevice(server.database, input.device, now)?.accountId === account.id
  ) {
    const session = openSession(server.database, account.id, input.origin, now)

    record(server.database, {
      accountId: account.id,
      email,
      at: now,
      outcome: 'signed-in',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    return {
      kind: 'signed-in',
      session: session.token,
      expiresAt: session.expiresAt,
    }
  }

  const byCode = consume(server.database, 'code', email, RULES.code, now)

  if (!byCode.allowed) {
    return {
      kind: 'refused',
      retryAt: byCode.retryAt,
      message:
        'Trop de codes demandés. Attendez un quart d’heure, ou utilisez le lien de secours.',
    }
  }

  const attempt = newToken()
  const code = newCode()
  const expiresAt = now + CODE_LIFETIME

  server.database
    .prepare(
      `insert into login_attempt
         (account_id, token_hash, code_hash, created_at, expires_at, ip, agent)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      account.id,
      fingerprint(attempt),
      codeFingerprint(attempt, code),
      now,
      expiresAt,
      input.origin.ip,
      input.origin.agent,
    )

  await deliver(server, account.email, () =>
    signInCode(
      server.site.name,
      code,
      Math.round(CODE_LIFETIME / MINUTE),
      input.origin,
    ),
  )

  record(server.database, {
    accountId: account.id,
    email,
    at: now,
    outcome: 'code-sent',
    ip: input.origin.ip,
    agent: input.origin.agent,
  })

  return { kind: 'code-sent', attempt, expiresAt }
}

export async function submitCode(
  server: Server,
  input: {
    readonly attempt: string
    readonly code: string
    readonly remember: boolean
    readonly origin: Origin
  },
): Promise<CodeResult> {
  const now = server.now()

  const row: Row | undefined = server.database
    .prepare('select * from login_attempt where token_hash = ?')
    .get(fingerprint(input.attempt))

  if (row === undefined) return { kind: 'refused', message: STALE }

  const id = number(row, 'id')
  const accountId = number(row, 'account_id')
  const tries = number(row, 'tries')

  if (
    maybeNumber(row, 'consumed_at') !== undefined ||
    now >= number(row, 'expires_at') ||
    tries >= CODE_TRIES
  ) {
    return { kind: 'refused', message: STALE }
  }

  const account = accountById(server.database, accountId)

  if (account === undefined) return { kind: 'refused', message: STALE }

  if (
    !sameSecret(
      text(row, 'code_hash'),
      codeFingerprint(input.attempt, input.code.trim()),
    )
  ) {
    const used = tries + 1

    server.database
      .prepare('update login_attempt set tries = ? where id = ?')
      .run(used, id)

    record(server.database, {
      accountId,
      email: account.email,
      at: now,
      outcome: 'code-rejected',
      ip: input.origin.ip,
      agent: input.origin.agent,
    })

    const remaining = CODE_TRIES - used

    return {
      kind: 'refused',
      remaining,
      message:
        remaining === 0
          ? STALE
          : `Ce code ne correspond pas. Il reste ${remaining} essai${remaining > 1 ? 's' : ''}.`,
    }
  }

  server.database
    .prepare('update login_attempt set consumed_at = ? where id = ?')
    .run(now, id)

  const session = openSession(server.database, accountId, input.origin, now)

  record(server.database, {
    accountId,
    email: account.email,
    at: now,
    outcome: 'signed-in',
    ip: input.origin.ip,
    agent: input.origin.agent,
  })

  const opened = {
    kind: 'signed-in',
    session: session.token,
    expiresAt: session.expiresAt,
  } as const

  if (!input.remember) return opened

  const device = trustDevice(server.database, accountId, input.origin, now)

  record(server.database, {
    accountId,
    email: account.email,
    at: now,
    outcome: 'device-trusted',
    ip: input.origin.ip,
    agent: input.origin.agent,
  })

  await deliver(server, account.email, () =>
    deviceTrusted(server.site.name, input.origin),
  )

  return { ...opened, device }
}

export function createRescue(
  server: Server,
  email: string,
): { readonly token: string; readonly expiresAt: number } {
  const now = server.now()
  const account = findAccount(server.database, email)

  if (account === undefined) {
    throw new Error(`Aucun compte pour « ${normalizeEmail(email)} ».`)
  }

  const token = newToken()
  const expiresAt = now + RESCUE_LIFETIME

  server.database
    .prepare(
      `insert into rescue (account_id, token_hash, created_at, expires_at)
       values (?, ?, ?, ?)`,
    )
    .run(account.id, fingerprint(token), now, expiresAt)

  return { token, expiresAt }
}

export function useRescue(
  server: Server,
  token: string,
  origin: Origin,
): RescueResult {
  const now = server.now()

  const row: Row | undefined = server.database
    .prepare('select * from rescue where token_hash = ?')
    .get(fingerprint(token))

  if (
    row === undefined ||
    maybeNumber(row, 'consumed_at') !== undefined ||
    now >= number(row, 'expires_at')
  ) {
    return {
      kind: 'refused',
      message: 'Ce lien de secours a expiré ou a déjà servi.',
    }
  }

  const accountId = number(row, 'account_id')
  const account = accountById(server.database, accountId)

  if (account === undefined) {
    return { kind: 'refused', message: 'Ce lien de secours ne vaut plus rien.' }
  }

  server.database
    .prepare('update rescue set consumed_at = ? where id = ?')
    .run(now, number(row, 'id'))

  clearFailures(server.database, account)

  const session = openSession(server.database, accountId, origin, now)

  record(server.database, {
    accountId,
    email: account.email,
    at: now,
    outcome: 'rescued',
    ip: origin.ip,
    agent: origin.agent,
  })

  return {
    kind: 'signed-in',
    session: session.token,
    expiresAt: session.expiresAt,
  }
}

function tooMany(retryAt: number): SignInResult {
  return {
    kind: 'refused',
    retryAt,
    message:
      'Trop de tentatives depuis cet appareil. Attendez un quart d’heure avant de réessayer.',
  }
}

// Un fournisseur d’email en panne ne fait pas échouer ce qui a déjà eu lieu en
// base : l’échec est signalé sur la sortie d’erreur, la connexion reste dans
// l’état où elle est, et le lien de secours prend le relais.
async function deliver(
  server: Server,
  to: string,
  compose: () => Letter,
): Promise<void> {
  try {
    await server.email.send({ to, ...compose() })
  } catch (cause) {
    process.stderr.write(
      `L’email n’est pas parti : ${(cause as Error).message}\n`,
    )
  }
}
