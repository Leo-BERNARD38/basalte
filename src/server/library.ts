// La médiathèque vue du panel : téléverser, décrire, supprimer.
//
// Le téléversement passe par la même fonction que les images déposées à la
// main dans le dépôt (`src/media/ingest.ts`) : rien de ce que le client envoie
// n’est conservé tel quel, et il n’existe qu’un seul chemin d’entrée pour une
// image (invariant 3).
//
// Un texte alternatif est exigé dans chaque langue en ligne avant que le
// fichier ne soit écrit : demandé plus tard, il ne le serait jamais.

import { rm } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import type { Schemas } from '../content/project.js'
import { languageName } from '../content/report.js'
import type { Translated } from '../fields/types.js'
import { ingest, MEDIA_DIR, storeMedia } from '../media/ingest.js'
import {
  MANIFEST_PATH,
  readManifest,
  writeManifest,
  type MediaEntry,
  type MediaManifest,
} from '../media/manifest.js'
import { fileName } from '../media/resolve.js'
import { countMediaUsage, type UsageSource } from '../media/usage.js'
import type { Panel } from './context.js'
import { badRequest, json } from './http.js'
import type { Commit } from './pages.js'

const KEY = /^[0-9a-f]{16}$/

const Coordinate = z.number().min(0).max(100)

const Update = z.object({
  alt: z.record(z.string(), z.string()).optional(),
  focal: z.object({ x: Coordinate, y: Coordinate }).nullable().optional(),
})

export type MediaSummary = MediaEntry & {
  readonly key: string
  readonly usage: number
}

export function describeMedia(
  manifest: MediaManifest,
  pages: readonly UsageSource[],
  schemas: Schemas,
): readonly MediaSummary[] {
  const usage = countMediaUsage(schemas.registry, pages)

  return Object.entries(manifest)
    .map(([key, entry]) => ({ ...entry, key, usage: usage.get(key) ?? 0 }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

export async function uploadMedia(
  panel: Panel,
  request: Request,
  schemas: Schemas,
  commit: Commit,
): Promise<Response> {
  const form = await readForm(request)

  if (form === undefined) return badRequest()

  const file = form.get('file')

  if (!(file instanceof File)) return badRequest()

  const alt = readAlt(form.get('alt'))
  const missing = missingAlt(alt, schemas)

  if (missing !== undefined) return json({ ok: false, message: missing }, 422)

  let ingested

  try {
    ingested = await ingest(Buffer.from(await file.arrayBuffer()), { alt })
  } catch (cause) {
    return json({ ok: false, message: (cause as Error).message }, 422)
  }

  const manifest = { ...(await readManifest(panel.root)) }
  const previous = manifest[ingested.key]

  await storeMedia(panel.root, ingested)

  manifest[ingested.key] = {
    ...ingested.entry,
    ...(previous?.focal === undefined ? {} : { focal: previous.focal }),
  }

  await writeManifest(panel.root, manifest)
  await commit(
    [MANIFEST_PATH, ...ingested.files.map((item) => mediaPath(item.name))],
    `média : ${ingested.key} ajouté`,
  )

  return json({
    ok: true,
    media: { ...manifest[ingested.key], key: ingested.key, usage: 0 },
  })
}

export async function updateMedia(
  panel: Panel,
  request: Request,
  key: string,
  schemas: Schemas,
  commit: Commit,
): Promise<Response> {
  if (!KEY.test(key)) return json({ ok: false, message: 'Média inconnu.' }, 404)

  const manifest = { ...(await readManifest(panel.root)) }
  const entry = manifest[key]

  if (entry === undefined) {
    return json({ ok: false, message: 'Média inconnu.' }, 404)
  }

  let body

  try {
    body = Update.safeParse(await request.json())
  } catch {
    return badRequest()
  }

  if (!body.success) return badRequest()

  const alt = body.data.alt === undefined ? entry.alt : body.data.alt
  const missing = missingAlt(alt, schemas)

  if (missing !== undefined) return json({ ok: false, message: missing }, 422)

  const focal =
    body.data.focal === undefined ? entry.focal : (body.data.focal ?? undefined)

  manifest[key] = {
    ...entry,
    alt,
    ...(focal === undefined ? {} : { focal }),
  }

  await writeManifest(panel.root, manifest)
  await commit([MANIFEST_PATH], `média : ${key} décrit`)

  return json({ ok: true, media: { ...manifest[key], key } })
}

export async function deleteMedia(
  panel: Panel,
  key: string,
  pages: readonly UsageSource[],
  schemas: Schemas,
  commit: Commit,
): Promise<Response> {
  if (!KEY.test(key)) return json({ ok: false, message: 'Média inconnu.' }, 404)

  const manifest = { ...(await readManifest(panel.root)) }
  const entry = manifest[key]

  if (entry === undefined) {
    return json({ ok: false, message: 'Média inconnu.' }, 404)
  }

  const usage = countMediaUsage(schemas.registry, pages).get(key) ?? 0

  if (usage > 0) {
    return json(
      {
        ok: false,
        message: `Cette image est employée par ${usage} section${usage > 1 ? 's' : ''}. Retire-la d’abord.`,
      },
      409,
    )
  }

  const removed = entry.widths.map((width) => fileName(key, width))

  for (const name of removed) {
    await rm(path.join(panel.root, MEDIA_DIR, name), { force: true })
  }

  delete manifest[key]

  await writeManifest(panel.root, manifest)
  await commit(
    [MANIFEST_PATH, ...removed.map(mediaPath)],
    `média : ${key} supprimé`,
  )

  return json({ ok: true, key })
}

function mediaPath(name: string): string {
  return path.join(MEDIA_DIR, name)
}

async function readForm(request: Request): Promise<FormData | undefined> {
  try {
    return await request.formData()
  } catch {
    return undefined
  }
}

function readAlt(value: unknown): Translated<string> {
  if (typeof value !== 'string') return {}

  try {
    const parsed: unknown = JSON.parse(value)
    const record = z.record(z.string(), z.string()).safeParse(parsed)

    return record.success ? record.data : {}
  } catch {
    return {}
  }
}

function missingAlt(
  alt: Translated<string>,
  schemas: Schemas,
): string | undefined {
  for (const language of schemas.site.languages.online) {
    if ((alt[language.code] ?? '').trim() === '') {
      return schemas.site.languages.online.length > 1
        ? `Le texte alternatif est obligatoire, y compris en ${languageName(language.code)}.`
        : 'Le texte alternatif est obligatoire : il décrit l’image à qui ne la voit pas.'
    }
  }

  return undefined
}
