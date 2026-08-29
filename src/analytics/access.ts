// La lecture des logs d’accès de Caddy. C’est toute la mesure d’audience du
// socle : aucun script sur le site public, aucun service tiers, aucune base
// de plus — donc aucun bandeau cookies et aucun octet de JavaScript (D14).
//
// Caddy écrit une ligne JSON par requête. L’anonymisation des adresses se fait
// chez lui, par le filtre `ip_mask` du Caddyfile : ce module ne reçoit déjà
// plus d’adresse complète, et n’a donc rien à anonymiser lui-même.
//
// Seul le fichier courant est lu, par la fin et sur une taille bornée : un log
// est une donnée d’appoint, et il ne doit jamais pouvoir remplir la mémoire du
// panel. Les fichiers déjà tournés par Caddy sont compressés, et une
// statistique qui remonte moins loin vaut mieux qu’un panel qui s’étouffe.

import { open } from 'node:fs/promises'

import type { Environment } from '../server/email/provider.js'

export const ACCESS_LOG = 'BASALTE_ACCESS_LOG'
export const DEFAULT_ACCESS_LOG = '/var/log/caddy/access.log'

/** La queue du fichier qui est lue, au plus. */
export const MAX_BYTES = 8 * 1024 * 1024

const ROBOT =
  /bot|crawl|spider|slurp|curl|wget|headless|monitor|preview|scan|python-requests|facebookexternalhit|feedfetcher|lighthouse/i

export type AccessEntry = {
  readonly at: number
  readonly method: string
  readonly path: string
  readonly status: number
  readonly ip: string
  readonly agent: string
  readonly referer: string
}

export function accessLogPath(environment: Environment): string {
  const declared = (environment[ACCESS_LOG] ?? '').trim()

  return declared === '' ? DEFAULT_ACCESS_LOG : declared
}

export function isRobot(agent: string): boolean {
  return agent === '' || ROBOT.test(agent)
}

/**
 * Les entrées postérieures à une date. `undefined` quand le fichier n’est pas
 * lisible — le panel le dit alors, plutôt que d’afficher des zéros.
 */
export async function readAccess(
  file: string,
  since: number,
): Promise<readonly AccessEntry[] | undefined> {
  const raw = await tail(file)

  if (raw === undefined) return undefined

  const entries: AccessEntry[] = []

  for (const line of raw.split('\n')) {
    const entry = parseEntry(line)

    if (entry !== undefined && entry.at >= since) entries.push(entry)
  }

  return entries
}

// La première ligne lue est coupée en son milieu dès que le fichier dépasse la
// taille bornée : elle est écartée plutôt que réparée.
async function tail(file: string): Promise<string | undefined> {
  let handle

  try {
    handle = await open(file, 'r')
  } catch {
    return undefined
  }

  try {
    const { size } = await handle.stat()
    const length = Math.min(size, MAX_BYTES)
    const buffer = Buffer.alloc(length)

    await handle.read(buffer, 0, length, size - length)

    const raw = buffer.toString('utf8')

    return length < size ? raw.slice(raw.indexOf('\n') + 1) : raw
  } catch {
    return undefined
  } finally {
    await handle.close()
  }
}

/** Une ligne de log en entrée d’audience, ou `undefined` si elle n’en est pas une. */
export function parseEntry(line: string): AccessEntry | undefined {
  if (line.trim() === '') return undefined

  let parsed: unknown

  try {
    parsed = JSON.parse(line)
  } catch {
    return undefined
  }

  const record = parsed as {
    readonly ts?: unknown
    readonly status?: unknown
    readonly request?: {
      readonly method?: unknown
      readonly uri?: unknown
      readonly client_ip?: unknown
      readonly remote_ip?: unknown
      readonly headers?: Readonly<Record<string, unknown>>
    }
  }

  const request = record.request

  if (typeof record.ts !== 'number' || request === undefined) return undefined
  if (typeof request.uri !== 'string') return undefined

  const headers = request.headers ?? {}

  return {
    at: Math.round(record.ts * 1000),
    method: typeof request.method === 'string' ? request.method : 'GET',
    path: pathOf(request.uri),
    status: typeof record.status === 'number' ? record.status : 0,
    ip:
      typeof request.client_ip === 'string'
        ? request.client_ip
        : typeof request.remote_ip === 'string'
          ? request.remote_ip
          : '',
    agent: header(headers, 'User-Agent'),
    referer: header(headers, 'Referer'),
  }
}

// Caddy écrit les en-têtes en listes de valeurs : seule la première compte.
function header(
  headers: Readonly<Record<string, unknown>>,
  name: string,
): string {
  const value = headers[name]

  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''

  const first: unknown = value[0]

  return typeof first === 'string' ? first : ''
}

function pathOf(uri: string): string {
  const query = uri.indexOf('?')

  return query === -1 ? uri : uri.slice(0, query)
}
