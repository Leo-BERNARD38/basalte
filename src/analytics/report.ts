// Le rapport d’audience que lit le client. C’est un ordre de grandeur, et le
// document le dit : le comptage des visiteurs uniques est approximatif, et le
// filtrage des robots se fait sur une liste de signatures qui vieillit.
//
// L’approximation tient à ce qu’un visiteur est reconnu par son adresse
// masquée et son navigateur — deux personnes derrière la même box comptent
// pour une, et la même personne sur deux appareils compte pour deux. Aucun
// cookie, aucune empreinte : c’est le prix d’une mesure qui ne suit personne.

import { DAY } from '../server/durations.js'
import { isRobot, readAccess, type AccessEntry } from './access.js'

/** La fenêtre du rapport, en jours. */
export const WINDOW_DAYS = 30

/** Ce que le rapport garde de chaque classement. */
export const TOP = 10

const ASSET = /\.[a-z0-9]{2,5}$/i
const SERVICE = /^\/(api|admin|media)(\/|$)/

export type Counted = {
  readonly key: string
  readonly visits: number
}

export type Daily = {
  /** Le jour en `AAAA-MM-JJ`, en temps universel. */
  readonly day: string
  readonly visits: number
  readonly visitors: number
}

export type AudienceReport = {
  /** Faux quand le log n’est pas lisible : le panel le dit au lieu d’afficher zéro. */
  readonly readable: boolean
  readonly from: number
  readonly to: number
  readonly visits: number
  readonly visitors: number
  /** Formulaires envoyés, comptés sur la requête elle-même. */
  readonly forms: number
  readonly days: readonly Daily[]
  readonly pages: readonly Counted[]
  readonly referrers: readonly Counted[]
}

export type ReportOptions = {
  /** Le domaine du site : ses propres pages ne sont pas des provenances. */
  readonly host: string
  readonly now: number
  readonly days?: number
}

export async function audienceReport(
  file: string,
  options: ReportOptions,
): Promise<AudienceReport> {
  const window = (options.days ?? WINDOW_DAYS) * DAY
  const entries = await readAccess(file, options.now - window)

  return entries === undefined
    ? empty(options.now, window)
    : buildReport(entries, options)
}

export function buildReport(
  entries: readonly AccessEntry[],
  options: ReportOptions,
): AudienceReport {
  const window = (options.days ?? WINDOW_DAYS) * DAY
  const from = options.now - window

  const pages = new Map<string, number>()
  const referrers = new Map<string, number>()
  const perDay = new Map<string, { visits: number; visitors: Set<string> }>()
  const visitors = new Set<string>()

  let visits = 0
  let forms = 0

  for (const entry of entries) {
    if (entry.at < from) continue
    if (isRobot(entry.agent)) continue

    if (isSubmission(entry)) forms += 1
    if (!isPage(entry)) continue

    const who = `${entry.ip}|${entry.agent}`
    const day = dayOf(entry.at)
    const bucket = perDay.get(day) ?? { visits: 0, visitors: new Set<string>() }

    bucket.visits += 1
    bucket.visitors.add(who)
    perDay.set(day, bucket)

    visitors.add(who)
    visits += 1

    pages.set(entry.path, (pages.get(entry.path) ?? 0) + 1)

    const source = hostOf(entry.referer)

    if (source !== '' && source !== options.host) {
      referrers.set(source, (referrers.get(source) ?? 0) + 1)
    }
  }

  return {
    readable: true,
    from,
    to: options.now,
    visits,
    visitors: visitors.size,
    forms,
    days: [...perDay.entries()]
      .map(([day, bucket]) => ({
        day,
        visits: bucket.visits,
        visitors: bucket.visitors.size,
      }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    pages: rank(pages),
    referrers: rank(referrers),
  }
}

// Une page est ce qu’un visiteur a vu : ni un fichier servi avec elle, ni une
// adresse du panel ou de l’API.
function isPage(entry: AccessEntry): boolean {
  return (
    entry.method === 'GET' &&
    entry.status < 400 &&
    !SERVICE.test(entry.path) &&
    !ASSET.test(entry.path)
  )
}

// L’envoi d’un formulaire est une requête journalisée comme une autre : la
// compter ne demande aucun traceur.
function isSubmission(entry: AccessEntry): boolean {
  return (
    entry.method === 'POST' &&
    entry.path === '/api/contact' &&
    entry.status < 400
  )
}

function rank(counts: Map<string, number>): readonly Counted[] {
  return [...counts.entries()]
    .map(([key, visits]) => ({ key, visits }))
    .sort((a, b) => b.visits - a.visits || a.key.localeCompare(b.key))
    .slice(0, TOP)
}

export function dayOf(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

function hostOf(referer: string): string {
  try {
    return new URL(referer).host
  } catch {
    return ''
  }
}

function empty(now: number, window: number): AudienceReport {
  return {
    readable: false,
    from: now - window,
    to: now,
    visits: 0,
    visitors: 0,
    forms: 0,
    days: [],
    pages: [],
    referrers: [],
  }
}
