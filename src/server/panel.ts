// Les adresses du panel, au-delà de l’authentification. Elles suivent la même
// forme que celle-ci — `Request` vers `Response`, rien du serveur qui les
// monte (D51) — et se déroulent donc entièrement dans les tests.
//
// La charge utile de démarrage est ce qui rend le panel piloté par le DSL : le
// navigateur reçoit la description des champs, jamais une liste d’écrans
// écrite à la main. Ajouter un type de champ au socle ne demande rien ici.

import { z } from 'zod'

import { audienceReport, type AudienceReport } from '../analytics/report.js'
import type { BlockDefinition } from '../blocks/define.js'
import { SLOTS } from '../chrome/define.js'
import { POST_FIELDS, type Journal } from '../journal/define.js'
import type { PublishState } from '../publish/publish.js'
import { META_FIELDS } from '../content/page.js'
import { validateFiles } from '../content/project.js'
import { readContent } from '../content/read.js'
import {
  languageName,
  renderIssue,
  type ContentIssue,
} from '../content/report.js'
import { describeFields, type FieldDescription } from '../fields/describe.js'
import {
  BUSINESS_ENTRY,
  BUSINESS_FIELDS,
  BUSINESS_TITLE,
} from '../seo/business.js'
import type { Capabilities } from '../site/capabilities.js'
import type { Account } from './account.js'
import {
  deleteDocument,
  describeDocuments,
  uploadDocument,
  type DocumentSummary,
} from './documents.js'
import {
  readBusinessDraft,
  saveBusiness,
  type BusinessDraft,
} from './business.js'
import { readChromeDraft, saveChrome, type ChromeDraft } from './chrome.js'
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
  cropMedia,
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
import {
  createPost,
  deletePost,
  readPostDrafts,
  savePost,
  type DraftPost,
} from './posts.js'

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

const ChromeBody = z.object({ blocks: z.array(Block).default([]) })
const BusinessBody = ChromeBody

const PostBody = z.object({
  hidden: z.record(z.string(), z.boolean()).default({}),
  fields: z.record(z.string(), z.unknown()).default({}),
})

const NewPostBody = z.object({
  title: z.string().min(1).max(200),
  date: z.string().min(1).max(20),
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
  /**
   * L’en-tête et le pied de page : ils ne sont pas dans `library`, qui est la
   * bibliothèque des sections qu’on ajoute à une page — le chrome, lui, est là
   * toujours et sur toutes.
   */
  readonly business: {
    readonly type: PanelBlockType
    readonly draft: BusinessDraft
  }
  readonly chrome: {
    readonly types: readonly PanelBlockType[]
    readonly draft: ChromeDraft
  }
  /**
   * Le journal, absent d’un site qui n’en déclare pas : l’onglet n’existe alors
   * pas, et le client ignore que la fonction existe.
   */
  readonly journal?: {
    readonly label: string
    readonly route: string
    readonly fields: readonly FieldDescription[]
    readonly posts: readonly DraftPost[]
  }
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
  /** Vrai dès qu’un canal prévient le client : sinon le panel est le seul endroit. */
  readonly notified: boolean
  /** À qui écrire quand quelque chose casse. Vide, l’écran n’en parle pas. */
  readonly support: string
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

  if (route[0] === 'chrome' && route.length === 1) {
    if (request.method !== 'PUT') return refuseMethod()

    const guard = guardWrite(request)

    return guard ?? writeChrome(panel, request, commit)
  }

  if (route[0] === 'business' && route.length === 1) {
    if (request.method !== 'PUT') return refuseMethod()

    const guard = guardWrite(request)

    return guard ?? writeBusiness(panel, request, commit)
  }

  if (route[0] === 'media' && route.length === 1) {
    if (request.method !== 'POST') return refuseMethod()

    const guard = guardOrigin(request)

    if (guard !== undefined) return guard

    return uploadMedia(panel, request, await panel.schemas(), commit)
  }

  // Avant la route par clé : « crop » n’est pas une empreinte, et tomber dans
  // le cas général répondrait « média inconnu » à une demande de recadrage.
  if (route[0] === 'media' && route.length === 2 && route[1] === 'crop') {
    if (request.method !== 'POST') return refuseMethod()

    const guard = guardWrite(request)

    return guard ?? cropMedia(panel, request, commit)
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

  if (route[0] === 'posts' && route.length === 1) {
    if (request.method !== 'POST') return refuseMethod()

    const guard = guardWrite(request)

    return guard ?? addPost(panel, request, commit)
  }

  if (route[0] === 'posts' && route.length === 2) {
    if (request.method !== 'PUT' && request.method !== 'DELETE') {
      return refuseMethod()
    }

    // Une suppression n’a pas de corps : la garder sous `guardWrite` la ferait
    // refuser pour un en-tête de type absent, là où c’est l’origine qui compte.
    const guard =
      request.method === 'DELETE' ? guardOrigin(request) : guardWrite(request)

    return guard ?? post(panel, request, route[1] ?? '', commit)
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

/** Le journal du site, ou la réponse qui dit qu’il n’en a pas. */
async function journalOf(panel: Panel): Promise<Journal | Response> {
  const { site } = await panel.schemas()

  return (
    site.journal ??
    json(
      {
        ok: false,
        message:
          'Ce site n’a pas de journal. Déclare « journal » dans site.config.ts.',
      },
      409,
    )
  )
}

async function addPost(
  panel: Panel,
  request: Request,
  commit: Commit,
): Promise<Response> {
  const journal = await journalOf(panel)

  if (journal instanceof Response) return journal

  let body

  try {
    body = NewPostBody.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const result = await createPost(
    panel.root,
    await panel.schemas(),
    journal,
    body.data,
    commit,
  )

  return result.kind === 'refused'
    ? refusal(result)
    : json({ ok: true, post: result.post, commit: result.commit })
}

// L’enregistrement et la suppression d’un billet. La seconde est le geste que
// les pages n’ont pas : un billet raté doit pouvoir disparaître.
async function post(
  panel: Panel,
  request: Request,
  slug: string,
  commit: Commit,
): Promise<Response> {
  const journal = await journalOf(panel)

  if (journal instanceof Response) return journal

  const schemas = await panel.schemas()
  const known = await readPostDrafts(panel.root, schemas, journal)

  if (!NAME.test(slug) || !known.some((entry) => entry.slug === slug)) {
    return json({ ok: false, message: 'Billet inconnu.' }, 404)
  }

  if (request.method === 'DELETE') {
    const removed = await deletePost(panel.root, journal, slug, commit)

    return json({ ok: true, slug, commit: removed.commit })
  }

  let body

  try {
    body = PostBody.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const result = await savePost(
    panel.root,
    schemas,
    journal,
    slug,
    body.data,
    commit,
  )

  return result.kind === 'refused'
    ? refusal(result)
    : json({ ok: true, post: result.post, commit: result.commit })
}

/**
 * La réponse d’un enregistrement refusé, dans la forme que le panel attend :
 * les phrases pour le résumé, et les incidents entiers pour que l’erreur se
 * pose sous le champ qui la cause plutôt que dans une liste à relire.
 */
function refusal(result: {
  readonly problems: readonly string[]
  readonly issues: readonly ContentIssue[]
}): Response {
  return json(
    {
      ok: false,
      message: 'Il reste quelque chose à corriger.',
      problems: result.problems,
      issues: result.issues,
    },
    422,
  )
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
    library: Object.values(schemas.registry).map(describeBlock),
    pages,
    chrome: {
      // L’ordre est celui de l’affichage — en-tête puis pied — et non celui du
      // disque, qui trie les dossiers par leur nom.
      types: SLOTS.flatMap((slot) => {
        const definition = schemas.chrome[slot]

        return definition === undefined ? [] : [describeBlock(definition)]
      }),
      draft: await readChromeDraft(panel.root, schemas),
    },
    business: {
      type: {
        name: BUSINESS_ENTRY,
        label: BUSINESS_TITLE,
        help: 'Ce que Google affiche du client : son adresse, ses horaires, son téléphone.',
        fields: describeFields(BUSINESS_FIELDS),
      },
      draft: await readBusinessDraft(panel.root, schemas),
    },
    media: describeMedia(schemas.media, pages, schemas),
    documents: describeDocuments(schemas.documents, pages, schemas),
    problems: issues.map((issue) => ({
      severity: issue.severity,
      message: renderIssue(issue),
    })),
    ...(schemas.site.journal === undefined
      ? {}
      : {
          journal: {
            label: schemas.site.journal.label,
            route: `/${schemas.site.journal.base}`,
            fields: describeFields(POST_FIELDS),
            posts: await readPostDrafts(
              panel.root,
              schemas,
              schemas.site.journal,
            ),
          },
        }),
    tracked: await isRepositoryRoot(panel.root),
    publication: panel.publisher.state(),
    unread: countUnread(panel.server.database),
    retention: panel.leads.months,
    notified: notifiedSomewhere(panel),
    support: panel.support,
  }

  return json(payload)
}

// Le client doit savoir s’il peut attendre une alerte ou s’il doit venir voir.
// Les deux canaux comptent pour un : l’écran dit qu’on le prévient, pas par où.
function notifiedSomewhere(panel: Panel): boolean {
  const { notify, to, notifier } = panel.leads

  return (notify && to !== '') || notifier !== undefined
}

function describeBlock(definition: BlockDefinition): PanelBlockType {
  return {
    name: definition.name,
    label: definition.label,
    ...(definition.help === undefined ? {} : { help: definition.help }),
    fields: describeFields(definition.fields),
  }
}

// L’enregistrement du chrome suit celui d’une page : refus d’un contenu
// invalide (D60), et un commit par écriture (D17).
async function writeChrome(
  panel: Panel,
  request: Request,
  commit: Commit,
): Promise<Response> {
  let body

  try {
    body = ChromeBody.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const result = await saveChrome(
    panel.root,
    await panel.schemas(),
    body.data.blocks,
    commit,
  )

  if (result.kind === 'refused') return refusal(result)

  return json({ ok: true, chrome: result.chrome, commit: result.commit })
}

// L’enregistrement de la fiche suit celui du chrome, pour les mêmes raisons.
async function writeBusiness(
  panel: Panel,
  request: Request,
  commit: Commit,
): Promise<Response> {
  let body

  try {
    body = BusinessBody.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const result = await saveBusiness(
    panel.root,
    await panel.schemas(),
    body.data.blocks,
    commit,
  )

  if (result.kind === 'refused') return refusal(result)

  return json({ ok: true, business: result.business, commit: result.commit })
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

  if (result.kind === 'refused') return refusal(result)

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
