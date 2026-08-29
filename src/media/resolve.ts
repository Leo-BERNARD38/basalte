// La résolution d’une clé de média vers ce qu’un composant met dans un `img` :
// les largeurs produites à l’ingestion deviennent un `srcset`, et le point
// focal une `object-position`.

import { pick } from '../fields/translate.js'
import { fileName } from './ingest.js'
import type { MediaManifest } from './manifest.js'

export const MEDIA_URL = '/media'

export type ResolvedImage = {
  readonly src: string
  readonly srcset: string
  readonly sizes: string
  readonly width: number
  readonly height: number
  readonly alt: string
  readonly objectPosition: string
}

export function resolveImage(
  manifest: MediaManifest,
  key: string,
  language: string,
  sizes = '100vw',
): ResolvedImage | undefined {
  const entry = manifest[key]

  if (entry === undefined || entry.widths.length === 0) return undefined

  return {
    src: `${MEDIA_URL}/${fileName(key, entry.width)}`,
    srcset: entry.widths
      .map((width) => `${MEDIA_URL}/${fileName(key, width)} ${width}w`)
      .join(', '),
    sizes,
    width: entry.width,
    height: entry.height,
    alt: pick(entry.alt, language),
    objectPosition: `${entry.focal?.x ?? 50}% ${entry.focal?.y ?? 50}%`,
  }
}
