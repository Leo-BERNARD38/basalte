// Les adresses du panel, au-delà de l’authentification. Elles suivent la même
// forme que celle-ci — `Request` vers `Response`, rien du serveur qui les
// monte (D51) — et se déroulent donc entièrement dans les tests.
//
// La charge utile de démarrage est ce qui rend le panel piloté par le DSL : le
// navigateur reçoit la description des champs, jamais une liste d’écrans
// écrite à la main. Ajouter un type de champ au socle ne demande rien ici.

import { z } from 'zod'

import { audienceReport, type AudienceReport } from '../analytics/report.js'
import type { PublishState } from '../publish/publish.js'
import { META_FIELDS } from '../content/page.js'
import { validateFiles } from '../content/project.js'
import { readContent } from '../content/read.js'
import { languageName, renderIssue } from '../content/report.js'
import { describeFields, type FieldDescription } from '../fields/describe.js'
import type { Capabilities } from '../site/capabilities.js'
import type { Account } from './account.js'
import {
  deleteDocument,
  describeDocuments,
  uploadDocument,
  type DocumentSummary,
} from './documents.js'
import type { Panel } from './context.js'
import { commitFiles, isRepositoryRoot } from './git.js'
import { authenticate } from './handlers.js'
import {
  badRequest,
  guardOrigin,
  guardWrite,
  json,
  refuseAnonymous,
  refuseMethod,
} from './http.js'
import {
  deleteMedia,
  describeMedia,
  updateMedia,
  uploadMedia,
  type MediaSummary,
} from './library.js'
import {
  countUnread,
  deleteLead,
  listLeads,
  markLeadRead,
  type Lead,
} from './leads.js'
import {
  draftsFrom,
  readDrafts,
  savePage,
  type Commit,
  type DraftPage,
} from './pages.js'

export const PANEL_API = '/api/'

const NAME = /^[a-z0-9][a-z0-9-]*$/

const Block = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  hidden: z.record(z.string(), z.boolean()).default({}),
  props: z.record(z.string(), z.unknown()).default({}),
})

const Draft = z.object({
  meta: z.record(z.string(), z.unknown()).default({}),
  blocks: z.array(Block).default([]),
})

export type PanelLanguage = {
  readonly code: string
  readonly label: string
  readonly default: boolean
  readonly draft: boolean
}

export type PanelBlockType = {
  readonly name: string
  readonly label: string
  readonly help?: string
  readonly fields: readonly FieldDescription[]
}

export type PanelPayload = {
  readonly ok: true
  readonly account: string
  readonly site: {
    readonly name: string
    readonly languages: readonly PanelLanguage[]
    readonly capabilities: Capabilities
  }
  readonly meta: readonly FieldDescription[]
  readonly library: readonly PanelBlockType[]
  readonly pages: readonly DraftPage[]
  readonly media: readonly MediaSummary[]
  readonly documents: readonly DocumentSummary[]
  readonly problems: readonly {
    readonly severity: 'error' | 'warning'
    readonly message: string
  }[]
  readonly tracked: boolean
  readonly publication: PublishState
  /** Messages non lus, pour la pastille de l’onglet. */
  readonly unread: number
  /** Durée de conservation des messages, en mois. */
  readonly retention: number
}

/** Ce que le panel affiche d’un message. L’adresse IP n’en sort pas. */
export type LeadSummary = Omit<Lead, 'ip' | 'agent'>

export const LEADS_LIMIT = 200

/**
 * Traite une adresse du panel, ou renvoie `undefined` si elle ne lui
 * appartient pas. L’authentification est passée avant d’arriver ici.
 */
export async function handlePanel(
  panel: Panel,
  request: Request,
): Promise<Response | undefined> {
  const url = new URL(request.url)

  if (!url.pathname.startsWith(PANEL_API)) return undefined

  const route = url.pathname.slice(PANEL_API.length).split('/')
  const account = authenticate(panel.server, request)

  if (account === undefined) return refuseAnonymous()

  const commit = commitAs(panel, account.email)

  if (route[0] === 'panel' && route.length === 1) {
    return request.method === 'GET'
      ? describePanel(panel, account.email)
      : refuseMethod()
  }

  if (route[0] === 'pages' && route.length === 2) {
    if (request.method !== 'PUT') return refuseMethod()

    const guard = guardWrite(request)

    return guard ?? save(panel, route[1] ?? '', request, commit)
  }

  if (route[0] === 'media' && route.length === 1) {
    if (request.method !== 'POST') return refuseMethod()

    const guard = guardOrigin(request)

    if (guard !== undefined) return guard

    return uploadMedia(panel, request, await panel.schemas(), commit)
  }

  if (route[0] === 'media' && route.length === 2) {
    return media(panel, request, route[1] ?? '', commit)
  }

  if (route[0] === 'documents' && route.length === 1) {
    if (request.method !== 'POST') return refuseMethod()

    const guard = guardOrigin(request)

    if (guard !== undefined) return guard

    return uploadDocument(panel, request, await panel.schemas(), commit)
  }

  if (route[0] === 'documents' && route.length === 2) {
    if (request.method !== 'DELETE') return refuseMethod()

    const guard = guardOrigin(request)

    if (guard !== undefined) return guard

    const schemas = await panel.schemas()
    const pages = await readDrafts(panel.root, schemas)

    return deleteDocument(panel, route[1] ?? '', pages, schemas, commit)
  }

  if (route[0] === 'publish' && route.length === 1) {
    return publish(panel, request, account)
  }

  if (route[0] === 'leads' && route.length === 1) {
    return request.method === 'GET' ? describeLeads(panel) : refuseMethod()
  }

  if (route[0] === 'leads' && route.length === 2) {
    return lead(panel, request, Number(route[1]))
  }

  if (route[0] === 'stats' && route.length === 1) {
    if (request.method !== 'GET') return refuseMethod()

    const { site } = await panel.schemas()

    if (!site.capabilities.analytics) {
      return json(
        {
          ok: false,
          message:
            'Ce site ne mesure pas son audience. Déclare « analytics » dans les capacités de site.config.ts.',
        },
        409,
      )
    }

    return describeAudience(panel)
  }

  return json({ ok: false, message: 'Adresse inconnue.' }, 404)
}

function commitAs(panel: Panel, email: string): Commit {
  return (files, message) => commitFiles(panel.root, files, message, email)
}

async function describePanel(panel: Panel, account: string): Promise<Response> {
  const schemas = await panel.schemas()

  // Le contenu est lu une fois pour ses deux usages : les pages brutes que le
  // panel ouvre, et les mêmes validées pour en tirer ce qui reste à corriger.
  const files = await readContent(panel.root)
  const pages = draftsFrom(files, schemas)
  const { issues } = validateFiles(files, schemas)

  const payload: PanelPayload = {
    ok: true,
    account,
    site: {
      name: schemas.site.name,
      languages: schemas.site.languages.all.map((language) => ({
        code: language.code,
        label: languageName(language.code),
        default: language.default,
        draft: language.draft,
      })),
      capabilities: schemas.site.capabilities,
    },
    meta: describeFields(META_FIELDS),
    library: Object.values(schemas.registry).map((definition) => ({
      name: definition.name,
      label: definition.label,
      ...(definition.help === undefined ? {} : { help: definition.help }),
      fields: describeFields(definition.fields),
    })),
    pages,
    media: describeMedia(schemas.media, pages, schemas),
    documents: describeDocuments(schemas.documents, pages, schemas),
    problems: issues.map((issue) => ({
      severity: issue.severity,
      message: renderIssue(issue),
    })),
    tracked: await isRepositoryRoot(panel.root),
    publication: panel.publisher.state(),
    unread: countUnread(panel.server.database),
    retention: panel.leads.months,
  }

  return json(payload)
}

async function save(
  panel: Panel,
  name: string,
  request: Request,
  commit: Commit,
): Promise<Response> {
  if (!NAME.test(name)) {
    return json({ ok: false, message: 'Page inconnue.' }, 404)
  }

  let body

  try {
    body = Draft.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const schemas = await panel.schemas()
  const known = await readDrafts(panel.root, schemas)

  if (!known.some((page) => page.name === name)) {
    return json({ ok: false, message: 'Page inconnue.' }, 404)
  }

  const result = await savePage(panel.root, schemas, name, body.data, commit)

  if (result.kind === 'refused') {
    return json(
      {
        ok: false,
        message: 'Il reste quelque chose à corriger.',
        problems: result.problems,
      },
      422,
    )
  }

  return json({ ok: true, page: result.page, commit: result.commit })
}

// Une mise en ligne dure plus longtemps qu’une requête : la demande rend l’état
// obtenu, et le panel revient le lire jusqu’à ce que la file soit vide.
function publish(panel: Panel, request: Request, account: Account): Response {
  if (request.method === 'GET') {
    return json({ ok: true, publication: panel.publisher.state() })
  }

  if (request.method !== 'POST') return refuseMethod()

  const guard = guardWrite(request)

  if (guard !== undefined) return guard

  return json({
    ok: true,
    publication: panel.publisher.request({
      accountId: account.id,
      email: account.email,
    }),
  })
}

function describeLeads(panel: Panel): Response {
  return json({
    ok: true,
    leads: listLeads(panel.server.database, LEADS_LIMIT).map((entry) =>
      summarize(entry),
    ),
    unread: countUnread(panel.server.database),
  })
}

// Le client lit et supprime ses messages ; il n’en écrit aucun. La suppression
// est celle que le RGPD demande, et elle est définitive : la base n’est pas
// versionnée.
function lead(panel: Panel, request: Request, id: number): Response {
  if (!Number.isInteger(id) || id <= 0) {
    return json({ ok: false, message: 'Message inconnu.' }, 404)
  }

  const guard =
    request.method === 'PATCH' ? guardWrite(request) : guardOrigin(request)

  if (guard !== undefined) return guard

  if (request.method === 'PATCH') {
    return markLeadRead(panel.server.database, id, panel.server.now())
      ? json({ ok: true })
      : json({ ok: false, message: 'Message inconnu.' }, 404)
  }

  if (request.method !== 'DELETE') return refuseMethod()

  return deleteLead(panel.server.database, id)
    ? json({ ok: true })
    : json({ ok: false, message: 'Message inconnu.' }, 404)
}

async function describeAudience(panel: Panel): Promise<Response> {
  const report: AudienceReport = await audienceReport(panel.accessLog, {
    host: new URL(panel.server.site.origin).host,
    now: panel.server.now(),
  })

  return json({ ok: true, audience: report })
}

function summarize(entry: Lead): LeadSummary {
  const { ip: _ip, agent: _agent, ...summary } = entry

  return summary
}

async function media(
  panel: Panel,
  request: Request,
  key: string,
  commit: Commit,
): Promise<Response> {
  if (request.method === 'PATCH') {
    const guard = guardWrite(request)

    if (guard !== undefined) return guard

    return updateMedia(panel, request, key, await panel.schemas(), commit)
  }

  if (request.method === 'DELETE') {
    const guard = guardOrigin(request)

    if (guard !== undefined) return guard

    const schemas = await panel.schemas()
    const pages = await readDrafts(panel.root, schemas)

    return deleteMedia(panel, key, pages, schemas, commit)
  }

  return refuseMethod()
}
