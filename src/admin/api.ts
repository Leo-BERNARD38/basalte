// Le dialogue avec le serveur. Une seule forme de réponse : ou bien la donnée
// attendue, ou bien un message français et, s’il y en a, la liste de ce qui
// reste à corriger. Aucun écran n’a donc à interpréter un code HTTP.

import type { AudienceReport } from '../analytics/report.js'
import type { PublishState } from '../publish/publish.js'
import type { DocumentSummary } from '../server/documents.js'
import type { MediaSummary } from '../server/library.js'
import type { DraftPage } from '../server/pages.js'
import type { LeadSummary, PanelPayload } from '../server/panel.js'
import type { Draft } from './draft.js'

export type Answer<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false
      readonly message: string
      readonly problems: readonly string[]
      readonly signedOut: boolean
    }

export type SignInStep = { readonly step: 'code' | 'panel' }

export type SessionInfo = {
  readonly email: string
  readonly devices: readonly {
    readonly agent: string
    readonly ip: string
    readonly createdAt: number
    readonly expiresAt: number
  }[]
  readonly journal: readonly {
    readonly at: number
    readonly ip: string
    readonly agent: string
    readonly label: string
  }[]
}

const OFFLINE = 'Le serveur ne répond pas. Réessaie dans un instant.'

export function loadPanel(): Promise<Answer<PanelPayload>> {
  return send('GET', '/api/panel')
}

export function savePage(
  name: string,
  draft: Draft,
): Promise<Answer<{ readonly page: DraftPage; readonly commit: boolean }>> {
  return send('PUT', `/api/pages/${name}`, draft)
}

export type Published = { readonly publication: PublishState }

/** Demande la mise en ligne. Elle rend la main sans attendre le build. */
export function publishSite(): Promise<Answer<Published>> {
  return send('POST', '/api/publish', {})
}

export function readPublication(): Promise<Answer<Published>> {
  return send('GET', '/api/publish')
}

export function readLeads(): Promise<
  Answer<{ readonly leads: readonly LeadSummary[]; readonly unread: number }>
> {
  return send('GET', '/api/leads')
}

export function markLeadRead(id: number): Promise<Answer<unknown>> {
  return send('PATCH', `/api/leads/${id}`, {})
}

export function deleteLead(id: number): Promise<Answer<unknown>> {
  return send('DELETE', `/api/leads/${id}`)
}

export function readAudience(): Promise<
  Answer<{ readonly audience: AudienceReport }>
> {
  return send('GET', '/api/stats')
}

export function signIn(
  email: string,
  password: string,
): Promise<Answer<SignInStep>> {
  return send('POST', '/api/auth/sign-in', { email, password })
}

export function submitCode(
  code: string,
  remember: boolean,
): Promise<Answer<SignInStep>> {
  return send('POST', '/api/auth/code', { code, remember })
}

export function signOut(): Promise<Answer<unknown>> {
  return send('POST', '/api/auth/sign-out', {})
}

export function readSession(): Promise<Answer<SessionInfo>> {
  return send('GET', '/api/auth/session')
}

export function changePassword(
  current: string,
  next: string,
): Promise<Answer<{ readonly closed: number }>> {
  return send('POST', '/api/auth/password', { current, next })
}

export function forgetDevices(): Promise<
  Answer<{ readonly forgotten: number }>
> {
  return send('POST', '/api/auth/devices/forget', {})
}

export function updateMedia(
  key: string,
  patch: {
    readonly alt?: Readonly<Record<string, string>>
    readonly focal?: { readonly x: number; readonly y: number } | null
  },
): Promise<Answer<{ readonly media: MediaSummary }>> {
  return send('PATCH', `/api/media/${key}`, patch)
}

export function deleteMedia(key: string): Promise<Answer<unknown>> {
  return send('DELETE', `/api/media/${key}`)
}

export async function uploadMedia(
  file: File,
  alt: Readonly<Record<string, string>>,
): Promise<Answer<{ readonly media: MediaSummary }>> {
  const form = new FormData()

  form.set('file', file)
  form.set('alt', JSON.stringify(alt))

  return receive(fetch('/api/media', { method: 'POST', body: form }))
}

export function deleteDocument(key: string): Promise<Answer<unknown>> {
  return send('DELETE', `/api/documents/${key}`)
}

export async function uploadDocument(
  file: File,
): Promise<Answer<{ readonly document: DocumentSummary }>> {
  const form = new FormData()

  form.set('file', file)

  return receive(fetch('/api/documents', { method: 'POST', body: form }))
}

async function send<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<Answer<T>> {
  return receive(
    fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
    }),
  )
}

async function receive<T>(pending: Promise<Response>): Promise<Answer<T>> {
  let response: Response

  try {
    response = await pending
  } catch {
    return { ok: false, message: OFFLINE, problems: [], signedOut: false }
  }

  let payload: Record<string, unknown> = {}

  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    payload = {}
  }

  if (response.ok && payload['ok'] === true) {
    return { ok: true, data: payload as T }
  }

  return {
    ok: false,
    message:
      typeof payload['message'] === 'string'
        ? payload['message']
        : `La demande a échoué (${response.status}).`,
    problems: Array.isArray(payload['problems'])
      ? (payload['problems'] as string[])
      : [],
    signedOut: response.status === 401,
  }
}
