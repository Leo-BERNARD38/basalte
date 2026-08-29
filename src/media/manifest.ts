// Le manifeste des médias : ce que le socle sait d’une image au-delà de son
// fichier — dimensions, largeurs produites à l’ingestion, point focal, texte
// alternatif par langue. Il est versionné avec le contenu, à côté des pages.
//
// Il se lit contre un schéma comme une page, et pour la même raison : c’est un
// fichier du dépôt, éditable à la main et fusionnable par git. Une entrée
// cassée y est refusée à la lecture, là où elle ferait sinon planter le rendu —
// et le point focal, qui part dans un attribut `style`, ne peut porter qu’un
// nombre.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import { CONTENT_DIR } from '../content/page.js'
import { writeJsonFile } from '../content/write.js'
import type { Translated } from '../fields/types.js'

export const MANIFEST_FILE = 'media.json'

export type MediaEntry = {
  /** Extension du fichier source, sans le point. */
  readonly format: string
  readonly width: number
  readonly height: number
  /** Largeurs WebP produites à l’ingestion, dans l’ordre croissant. */
  readonly widths: readonly number[]
  readonly alt: Translated<string>
  /** Position du sujet, en pourcentage, pour `object-position`. */
  readonly focal?: { readonly x: number; readonly y: number }
}

export type MediaManifest = Readonly<Record<string, MediaEntry>>

export const MANIFEST_PATH = path.join(CONTENT_DIR, MANIFEST_FILE)

const COORDINATE = z.number().min(0).max(100)

// Le point focal absent est retiré plutôt que laissé à `undefined` : une clé
// présente et vide se retrouverait telle quelle dans le fichier réécrit.
const ENTRY = z
  .object({
    format: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    widths: z.array(z.number().int().positive()).min(1),
    alt: z.record(z.string(), z.string()).default({}),
    focal: z.object({ x: COORDINATE, y: COORDINATE }).optional(),
  })
  .transform(({ focal, ...entry }): MediaEntry => ({
    ...entry,
    ...(focal === undefined ? {} : { focal }),
  }))

const MANIFEST = z.record(z.string().regex(/^[0-9a-f]{16}$/), ENTRY)

export async function readManifest(root: string): Promise<MediaManifest> {
  let raw

  try {
    raw = await readFile(path.join(root, MANIFEST_PATH), 'utf8')
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return {}

    throw cause
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    throw new Error(
      `« ${MANIFEST_PATH} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }

  const manifest = MANIFEST.safeParse(parsed)

  if (!manifest.success) {
    const first = manifest.error.issues[0]

    throw new Error(
      `« ${MANIFEST_PATH} » ne décrit pas une médiathèque : ${first?.path.join(' › ') || 'racine'} — ${first?.message ?? 'forme inattendue'}.`,
    )
  }

  return manifest.data
}

export async function writeManifest(
  root: string,
  manifest: MediaManifest,
): Promise<void> {
  const ordered = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  )

  await writeJsonFile(path.join(root, MANIFEST_PATH), ordered)
}
