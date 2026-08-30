// La résolution d’une clé de média vers ce qu’un composant met dans un `img` :
// les largeurs produites à l’ingestion deviennent un `srcset`, et le point
// focal une `object-position`. Et celle d’une clé de document vers le lien
// qui le télécharge.
//
// Ce fichier ne touche ni au disque ni à sharp : le panel s’en sert dans le
// navigateur, où rien de `node:` n’a sa place.

import { pick } from '../fields/translate.js'
import type { DocumentManifest } from './documents.js'
import type { MediaManifest } from './manifest.js'

export const MEDIA_URL = '/media'
export const DOCUMENT_URL = '/documents'
export const DOCUMENT_TYPE = 'application/pdf'

const STORED_DOCUMENT = /^[0-9a-f]{16}\.pdf$/

/** Le nom d’un document stocké : son empreinte, et rien du nom d’origine. */
export function documentFileName(key: string): string {
  return `${key}.pdf`
}

export function documentUrl(key: string): string {
  return `${DOCUMENT_URL}/${documentFileName(key)}`
}

export function isDocumentFile(name: string): boolean {
  return STORED_DOCUMENT.test(name)
}

export type ResolvedDocument = {
  readonly href: string
  readonly name: string
  readonly bytes: number
  /** Le poids en français, tel qu’un lien de téléchargement l’annonce. */
  readonly weight: string
}

const KILO = 1024

export function documentWeight(bytes: number): string {
  return bytes < KILO * KILO
    ? `${Math.max(1, Math.round(bytes / KILO))} Ko`
    : `${(bytes / KILO / KILO).toFixed(1)} Mo`
}

export function resolveDocument(
  manifest: DocumentManifest,
  key: string,
): ResolvedDocument | undefined {
  const entry = manifest[key]

  if (entry === undefined) return undefined

  return {
    href: documentUrl(key),
    name: entry.name,
    bytes: entry.bytes,
    weight: documentWeight(entry.bytes),
  }
}

/** Le nom d’une dérivée : l’empreinte, la largeur, et le format produit. */
export function fileName(key: string, width: number): string {
  return `${key}-${width}.webp`
}

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
