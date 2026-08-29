// Le flux de connexion exposé en HTTP, en fonctions `Request` vers `Response`
// et rien de plus. Le panel de la phase 3 les monte dans Astro sans les
// réécrire, et les tests les appellent directement, cookies compris.
//
// Deux gardes indépendantes protègent chaque requête qui écrit : le corps doit
// être annoncé en JSON, et l’en-tête `Origin` doit désigner le même hôte que
// la requête. Un formulaire hébergé ailleurs échoue sur les deux.

import { z } from 'zod'

import { accountById, changePassword, type Account } from './account.js'
import type { Server } from './context.js'
import { clearCookie, COOKIES, readCookie, setCookie } from './cookies.js'
import { forgetDevices, listDevices, TRUST } from './device.js'
import { SECOND } from './durations.js'
import {
  badRequest,
  guardWrite,
  json,
  originOf,
  parseBody,
  refuseAnonymous,
  refuseMethod,
} from './http.js'
import { OUTCOME_LABELS, record, recentEntries } from './journal.js'
import {
  CODE_LIFETIME,
  signIn,
  submitCode,
  useRescue,
  type CodeResult,
  type SignInResult,
} from './login.js'
import {
  closeSession,
  readSession,
  revokeOtherSessions,
  revokeSessions,
  type Origin,
} from './session.js'

export const AUTH_PREFIX = '/api/auth/'
export const RESCUE_PATH = '/admin/rescue'
export const PANEL_PATH = '/admin'
export const JOURNAL_LIMIT = 20

const SignIn = z.object({
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(400),
})

const Code = z.object({
  code: z.string().min(1).max(20),
  remember: z.boolean().default(false),
})

const Password = z.object({
  current: z.string().min(1).max(400),
  next: z.string().min(1).max(400),
})

/**
 * Traite une requête d’authentification, ou renvoie `undefined` si l’adresse
 * ne lui appartient pas — le reste du panel prend alors la main.
 */
export async function handleAuth(
  server: Server,
  request: Request,
): Promise<Response | undefined> {
  const url = new URL(request.url)
  const origin = originOf(request)

  if (url.pathname === RESCUE_PATH) {
    return request.method === 'GET'
      ? rescue(server, url, origin)
      : refuseMethod()
  }

  if (!url.pathname.startsWith(AUTH_PREFIX)) return undefined

  const action = url.pathname.slice(AUTH_PREFIX.length)

  if (action === 'session' && request.method === 'GET') {
    return describeSession(server, request)
  }

  if (request.method !== 'POST') return refuseMethod()

  const guard = guardWrite(request)

  if (guard !== undefined) return guard

  switch (action) {
    case 'sign-in':
      return startSignIn(server, request, origin)
    case 'code':
      return finishSignIn(server, request, origin)
    case 'sign-out':
      return signOut(server, request, origin)
    case 'password':
      return updatePassword(server, request, origin)
    case 'devices/forget':
      return forget(server, request, origin)
    default:
      return json({ ok: false, message: 'Adresse inconnue.' }, 404)
  }
}

/** Le compte derrière le cookie de session, ou `undefined`. */
export function authenticate(
  server: Server,
  request: Request,
): Account | undefined {
  const token = readCookie(request.headers.get('cookie'), COOKIES.session)

  if (token === undefined) return undefined

  const session = readSession(server.database, token, server.now())

  return session === undefined
    ? undefined
    : accountById(server.database, session.accountId)
}

async function startSignIn(
  server: Server,
  request: Request,
  origin: Origin,
): Promise<Response> {
  const body = await parseBody(request, SignIn)

  if (body === undefined) return badRequest()

  const device = readCookie(request.headers.get('cookie'), COOKIES.device)

  const result = await signIn(server, {
    email: body.email,
    password: body.password,
    ...(device === undefined ? {} : { device }),
    origin,
  })

  return renderSignIn(result, server.now())
}

function renderSignIn(result: SignInResult, now: number): Response {
  if (result.kind === 'refused') {
    return json(
      {
        ok: false,
        message: result.message,
        ...(result.retryAt === undefined ? {} : { retryAt: result.retryAt }),
      },
      result.retryAt === undefined ? 401 : 429,
    )
  }

  if (result.kind === 'code-sent') {
    return json({ ok: true, step: 'code', expiresAt: result.expiresAt }, 200, [
      setCookie(COOKIES.attempt, result.attempt, {
        maxAge: CODE_LIFETIME / SECOND,
      }),
    ])
  }

  return json({ ok: true, step: 'panel' }, 200, [
    session(result.session, result.expiresAt, now),
    clearCookie(COOKIES.attempt),
  ])
}

async function finishSignIn(
  server: Server,
  request: Request,
  origin: Origin,
): Promise<Response> {
  const body = await parseBody(request, Code)

  if (body === undefined) return badRequest()

  const attempt = readCookie(request.headers.get('cookie'), COOKIES.attempt)

  if (attempt === undefined) {
    return json(
      { ok: false, message: 'Cette connexion n’est plus valable.' },
      401,
    )
  }

  const result = await submitCode(server, {
    attempt,
    code: body.code,
    remember: body.remember,
    origin,
  })

  return renderCode(result, server.now())
}

function renderCode(result: CodeResult, now: number): Response {
  if (result.kind === 'refused') {
    return json(
      {
        ok: false,
        message: result.message,
        ...(result.remaining === undefined
          ? {}
          : { remaining: result.remaining }),
      },
      401,
    )
  }

  const cookies = [
    session(result.session, result.expiresAt, now),
    clearCookie(COOKIES.attempt),
  ]

  if (result.device !== undefined) {
    cookies.push(
      setCookie(COOKIES.device, result.device.token, {
        maxAge: TRUST / SECOND,
      }),
    )
  }

  return json({ ok: true, step: 'panel' }, 200, cookies)
}

function signOut(server: Server, request: Request, origin: Origin): Response {
  const token = readCookie(request.headers.get('cookie'), COOKIES.session)
  const account = authenticate(server, request)

  if (token !== undefined) {
    closeSession(server.database, token, server.now())
  }

  if (account !== undefined) {
    record(server.database, {
      accountId: account.id,
      email: account.email,
      at: server.now(),
      outcome: 'signed-out',
      ip: origin.ip,
      agent: origin.agent,
    })
  }

  return json({ ok: true }, 200, [clearCookie(COOKIES.session)])
}

function describeSession(server: Server, request: Request): Response {
  const account = authenticate(server, request)

  if (account === undefined) return refuseAnonymous()

  const now = server.now()

  return json({
    ok: true,
    signedIn: true,
    email: account.email,
    devices: listDevices(server.database, account.id, now).map((device) => ({
      agent: device.agent,
      ip: device.ip,
      createdAt: device.createdAt,
      expiresAt: device.expiresAt,
    })),
    journal: recentEntries(server.database, account.id, JOURNAL_LIMIT).map(
      (entry) => ({
        at: entry.at,
        ip: entry.ip,
        agent: entry.agent,
        label: OUTCOME_LABELS[entry.outcome] ?? entry.outcome,
      }),
    ),
  })
}

async function updatePassword(
  server: Server,
  request: Request,
  origin: Origin,
): Promise<Response> {
  const account = authenticate(server, request)

  if (account === undefined) return refuseAnonymous()

  const body = await parseBody(request, Password)

  if (body === undefined) return badRequest()

  try {
    await changePassword(
      server.database,
      account,
      body.current,
      body.next,
      server.now(),
    )
  } catch (cause) {
    return json({ ok: false, message: (cause as Error).message }, 400)
  }

  const token = readCookie(request.headers.get('cookie'), COOKIES.session)

  const closed =
    token === undefined
      ? 0
      : revokeOtherSessions(server.database, account.id, token, server.now())

  record(server.database, {
    accountId: account.id,
    email: account.email,
    at: server.now(),
    outcome: 'password-changed',
    ip: origin.ip,
    agent: origin.agent,
  })

  return json({ ok: true, closed })
}

function forget(server: Server, request: Request, origin: Origin): Response {
  const account = authenticate(server, request)

  if (account === undefined) return refuseAnonymous()

  const now = server.now()
  const forgotten = forgetDevices(server.database, account.id, now)

  revokeSessions(server.database, account.id, now)

  record(server.database, {
    accountId: account.id,
    email: account.email,
    at: now,
    outcome: 'devices-revoked',
    ip: origin.ip,
    agent: origin.agent,
  })

  return json({ ok: true, forgotten }, 200, [
    clearCookie(COOKIES.device),
    clearCookie(COOKIES.session),
  ])
}

function rescue(server: Server, url: URL, origin: Origin): Response {
  const token = url.searchParams.get('token') ?? ''
  const result = useRescue(server, token, origin)

  if (result.kind === 'refused') {
    return new Response(result.message, {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return new Response(null, {
    status: 303,
    headers: [
      ['location', PANEL_PATH],
      ['set-cookie', session(result.session, result.expiresAt, server.now())],
      ['set-cookie', clearCookie(COOKIES.attempt)],
    ],
  })
}

function session(token: string, expiresAt: number, now: number): string {
  return setCookie(COOKIES.session, token, {
    maxAge: (expiresAt - now) / SECOND,
  })
}
