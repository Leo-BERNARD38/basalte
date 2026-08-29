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
import { CONTENT_FORMAT } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { MANIFEST_PATH, type MediaManifest } from '../media/manifest.js'
import { defineSite } from '../site/define.js'
import { harness, HERE, type Harness } from './auth.fixture.js'
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

export type Bench = {
  readonly panel: Panel
  readonly root: string
  readonly harness: Harness
  /** L’en-tête `Cookie` d’une session ouverte, pour une requête écrite à la main. */
  readonly cookie: string
  call(
    method: string,
    address: string,
    body?: unknown,
    options?: CallOptions,
  ): Promise<Response>
  page(): Promise<Record<string, unknown>>
  media(): Promise<MediaManifest>
  close(): Promise<void>
}

export async function bench(content: unknown = defaultPage()): Promise<Bench> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'site-'))
  const carrier = await harness()

  await mkdir(path.join(root, 'content'), { recursive: true })
  await write(path.join(root, 'content', 'index.json'), content)
  await write(path.join(root, MANIFEST_PATH), MANIFEST)

  const registry = await loadRegistry(await findBlocks(blockRoots(root)))

  const site = defineSite({
    name: 'Banc d’essai',
    domain: 'banc.test',
    languages: { fr: { default: true }, en: { draft: true } },
  })

  const panel: Panel = {
    server: carrier.server,
    root,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      media: (await read(path.join(root, MANIFEST_PATH))) as MediaManifest,
    }),
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

      return (
        (await handlePanel(panel, request)) ??
        new Response('hors panel', { status: 404 })
      )
    },

    async page() {
      return (await read(path.join(root, 'content', 'index.json'))) as Record<
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
