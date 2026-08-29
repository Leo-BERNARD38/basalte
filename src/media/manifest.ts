// Le manifeste des médias : ce que le socle sait d’une image au-delà de son
// fichier — dimensions, largeurs produites à l’ingestion, point focal, texte
// alternatif par langue. Il est versionné avec le contenu, à côté des pages.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { CONTENT_DIR } from '../content/page.js'
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

export async function readManifest(root: string): Promise<MediaManifest> {
  try {
    const raw = await readFile(path.join(root, MANIFEST_PATH), 'utf8')

    return JSON.parse(raw) as MediaManifest
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return {}

    throw new Error(
      `« ${MANIFEST_PATH} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }
}

export async function writeManifest(
  root: string,
  manifest: MediaManifest,
): Promise<void> {
  const ordered = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  )

  await writeFile(
    path.join(root, MANIFEST_PATH),
    `${JSON.stringify(ordered, null, 2)}\n`,
    'utf8',
  )
}
