// Le banc d’essai du panel : un dépôt de site jetable, une session ouverte, et
// une fonction qui envoie une requête comme le ferait le navigateur — cookie,
// origine et type de corps compris.
//
// Le dossier est créé sous le dépôt du socle, jamais dans un dossier
// temporaire du système : c’est ce qui laisse `git` répondre pour de bon aux
// tests qui l’interrogent.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { blockRoots, findBlocks, loadRegistry } from '../blocks/scan.js'
import { findChrome } from '../chrome/scan.js'
import { BUSINESS_PATH } from '../content/business.js'
import { CHROME_PATH } from '../content/chrome.js'
import { CONTENT_FORMAT } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { readDocuments } from '../media/documents.js'
import { MANIFEST_PATH, type MediaManifest } from '../media/manifest.js'
import {
  createPublisher,
  type Build,
  type Publisher,
} from '../publish/publish.js'
import type { CapabilityOverrides } from '../site/capabilities.js'
import { defineSite } from '../site/define.js'
import type { Letter } from './email/messages.js'
import { memoryProvider, type MemoryProvider } from './email/memory.js'
import type { Lead } from './leads.js'
import type { Notifier } from './webhook.js'
import { harness, HERE, type Harness } from './auth.fixture.js'
import { handleContact } from './contact.js'
import type { Panel } from './context.js'
import { COOKIES } from './cookies.js'
import { handlePanel } from './panel.js'
import { openSession } from './session.js'

export const ORIGIN = 'https://banc.test'
export const IMAGE = '0123456789abcdef'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

export const MANIFEST: MediaManifest = {
  [IMAGE]: {
    format: 'webp',
    width: 1200,
    height: 800,
    widths: [480, 1200],
    alt: { fr: 'Une image d’essai', en: '' },
  },
}

export type CallOptions = {
  /** `null` retire l’en-tête, comme le ferait une requête d’un autre site. */
  readonly origin?: string | null
  /** `false` envoie le corps sans l’annoncer en JSON. */
  readonly json?: boolean
  readonly cookie?: boolean
}

export type BenchOptions = {
  readonly content?: unknown
  /** Le build employé par la file. Par défaut, il écrit une page et réussit. */
  readonly build?: Build
  /** Une deuxième page de contenu, sous le nom donné. */
  readonly pages?: Readonly<Record<string, unknown>>
  /** Vide, aucun message n’est notifié : ils restent dans le panel. */
  readonly contactTo?: string
  /** Monte l’adresse de notification, et retient ce qui y part. */
  readonly webhook?: boolean
  /** Ce que le canal de notification fait de chaque appel. */
  readonly notifierFails?: boolean
  /** Le log d’accès que lit le rapport d’audience. */
  readonly accessLog?: string
  /** Ce que le site déclare faire. Par défaut, les valeurs du socle. */
  readonly capabilities?: CapabilityOverrides
}

export type Bench = {
  readonly panel: Panel
  readonly root: string
  readonly harness: Harness
  readonly publisher: Publisher
  /** La racine servie : `releases/` et `current` y vivent. */
  readonly serving: string
  /** Les alertes parties au mainteneur, dans l’ordre. */
  readonly alerts: readonly Letter[]
  /** Le canal du site : ce qui part au client, messages du formulaire compris. */
  readonly mail: MemoryProvider
  /** Ce qui est parti par l’adresse de notification, dans l’ordre. */
  readonly notified: readonly Lead[]
  /** L’en-tête `Cookie` d’une session ouverte, pour une requête écrite à la main. */
  readonly cookie: string
  call(
    method: string,
    address: string,
    body?: unknown,
    options?: CallOptions,
  ): Promise<Response>
  /** Un envoi de formulaire, tel que le poste un navigateur. */
  submit(
    fields: Readonly<Record<string, string>>,
    options?: CallOptions,
  ): Promise<Response>
  page(): Promise<Record<string, unknown>>
  /** Le `content/chrome.json` du dépôt jetable, tel qu’il est sur le disque. */
  chrome(): Promise<Record<string, unknown>>
  /** Le `content/business.json` du dépôt jetable, de la même façon. */
  business(): Promise<Record<string, unknown>>
  media(): Promise<MediaManifest>
  close(): Promise<void>
}

// Un `Request` construit en mémoire ne porte pas de `content-length` ; un
// navigateur, si. Le banc l’ajoute pour ressembler à ce qui arrivera vraiment,
// et pour que les gardes de taille soient réellement traversées.
async function announceLength(request: Request): Promise<void> {
  if (request.headers.has('content-length')) return

  const bytes = (await request.clone().arrayBuffer()).byteLength

  request.headers.set('content-length', String(bytes))
}

/** Un build court : il écrit une page dans le dossier reçu, et réussit. */
export const buildsFine: Build = async (_root, outDir) => {
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), '<p>banc</p>', 'utf8')

  return { kind: 'built' }
}

/** Un build qui échoue, comme le ferait un contenu invalide. */
export function buildsBadly(detail = 'le contenu ne passe pas'): Build {
  return async () => ({ kind: 'failed', detail })
}

export async function bench(settings: BenchOptions = {}): Promise<Bench> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'site-'))
  const serving = path.join(root, '.basalte', 'site')
  const carrier = await harness()
  const alerts: Letter[] = []

  await mkdir(path.join(root, 'content'), { recursive: true })
  await write(
    path.join(root, 'content', 'index.json'),
    settings.content ?? defaultPage(),
  )

  for (const [name, page] of Object.entries(settings.pages ?? {})) {
    await write(path.join(root, 'content', `${name}.json`), page)
  }

  await write(path.join(root, MANIFEST_PATH), MANIFEST)

  const registry = await loadRegistry(await findBlocks(blockRoots(root)))
  const chrome = await loadRegistry(await findChrome(root))

  const site = defineSite({
    name: 'Banc d’essai',
    domain: 'banc.test',
    languages: { fr: { default: true }, en: { draft: true } },
    ...(settings.capabilities === undefined
      ? {}
      : { capabilities: settings.capabilities }),
  })

  const publisher = createPublisher({
    root,
    site: site.name,
    database: carrier.server.database,
    now: carrier.server.now,
    environment: { BASALTE_SITE_ROOT: serving },
    build: settings.build ?? buildsFine,
    alert: async (letter) => {
      alerts.push(letter)
    },
  })

  const mail = memoryProvider()
  const notified: Lead[] = []

  // Le canal de notification tel qu’un test le veut : il retient, ou il tombe.
  const notifier: Notifier | undefined = settings.webhook
    ? {
        host: 'exemple.test',
        async send(lead: Lead): Promise<void> {
          if (settings.notifierFails === true) {
            throw new Error('l’adresse ne répond pas')
          }

          notified.push(lead)
        },
      }
    : undefined

  const panel: Panel = {
    server: carrier.server,
    root,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      chrome,
      media: (await read(path.join(root, MANIFEST_PATH))) as MediaManifest,
      documents: await readDocuments(root),
    }),
    publisher,
    leads: {
      notify: site.capabilities.notifyLeads,
      to: settings.contactTo ?? 'client@exemple.fr',
      provider: mail,
      notifier,
      months: 12,
    },
    accessLog: settings.accessLog ?? path.join(root, 'access.log'),
    support: 'leo@exemple.fr',
  }

  const session = openSession(
    carrier.server.database,
    carrier.account().id,
    HERE,
    carrier.server.now(),
  )

  const cookie = `${COOKIES.session}=${session.token}`

  return {
    panel,
    root,
    harness: carrier,
    publisher,
    serving,
    alerts,
    mail,
    notified,
    cookie,

    async call(method, address, body, options = {}) {
      const headers = new Headers()

      if (options.cookie !== false) headers.set('cookie', cookie)

      const origin = options.origin === undefined ? ORIGIN : options.origin

      if (origin !== null) headers.set('origin', origin)

      const raw = body instanceof FormData

      if (body !== undefined && !raw && options.json !== false) {
        headers.set('content-type', 'application/json')
      }

      const request = new Request(`${ORIGIN}${address}`, {
        method,
        headers,
        ...(body === undefined
          ? {}
          : { body: raw ? body : JSON.stringify(body) }),
      })

      if (body !== undefined) await announceLength(request)

      return (
        (await handlePanel(panel, request)) ??
        new Response('hors panel', { status: 404 })
      )
    },

    async submit(fields, options = {}) {
      const headers = new Headers({
        'content-type': 'application/x-www-form-urlencoded',
      })

      const origin = options.origin === undefined ? ORIGIN : options.origin

      if (origin !== null) headers.set('origin', origin)

      const body = new URLSearchParams(fields).toString()

      headers.set('content-length', String(Buffer.byteLength(body)))

      const request = new Request(`${ORIGIN}/api/contact`, {
        method: 'POST',
        headers,
        body,
      })

      return (
        (await handleContact(panel, request)) ??
        new Response('hors contact', { status: 404 })
      )
    },

    async page() {
      return (await read(path.join(root, 'content', 'index.json'))) as Record<
        string,
        unknown
      >
    },

    async chrome() {
      return (await read(path.join(root, CHROME_PATH))) as Record<
        string,
        unknown
      >
    },

    async business() {
      return (await read(path.join(root, BUSINESS_PATH))) as Record<
        string,
        unknown
      >
    },

    async media() {
      return (await read(path.join(root, MANIFEST_PATH))) as MediaManifest
    },

    async close() {
      carrier.close()
      await rm(root, { recursive: true, force: true })
    },
  }
}

export function defaultPage(): Readonly<Record<string, unknown>> {
  return {
    $format: CONTENT_FORMAT,
    meta: {
      title: { fr: 'Accueil', en: '' },
      description: { fr: '', en: '' },
    },
    blocks: [
      {
        id: 'h1',
        type: 'hero',
        hidden: {},
        props: {
          title: { fr: 'Bonjour', en: '' },
          subtitle: { fr: '', en: '' },
          image: '',
          cta: { label: { fr: '', en: '' }, href: '' },
        },
      },
      {
        id: 'r1',
        type: 'richtext',
        hidden: {},
        props: {
          title: { fr: '', en: '' },
          body: { fr: 'Un **texte**.', en: '' },
        },
      },
    ],
  }
}

async function write(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function read(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return {}
  }
}
