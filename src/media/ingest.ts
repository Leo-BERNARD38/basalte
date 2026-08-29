// L’ingestion d’une image. C’est le seul endroit du socle où une image est
// écrite, et il produit d’un coup le fichier stocké et ses largeurs : le build
// ne traite donc aucune image, et le panel appellera la même fonction au
// téléversement.
//
// Rien de ce qui est reçu n’est conservé tel quel (invariant 3) : le type est
// lu sur les octets réels, l’orientation EXIF est appliquée puis les
// métadonnées jetées, et le nom vient de l’empreinte du contenu.

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp, { type Metadata } from 'sharp'

import type { Translated } from '../fields/types.js'
import type { MediaEntry } from './manifest.js'
import { fileName } from './resolve.js'

export const MEDIA_DIR = path.join('public', 'media')
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_WIDTH = 2560
export const WIDTHS: readonly number[] = [480, 768, 1200, 1800, MAX_WIDTH]
export const QUALITY = 82

const ACCEPTED = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'heif'])
const DERIVATIVE = /^[0-9a-f]{16}-\d+\.webp$/

export type IngestedFile = {
  readonly name: string
  readonly data: Buffer
}

export type Ingested = {
  readonly key: string
  readonly entry: MediaEntry
  readonly files: readonly IngestedFile[]
}

export function isDerivative(name: string): boolean {
  return DERIVATIVE.test(name)
}

export async function ingest(
  input: Buffer,
  options: { readonly alt?: Translated<string> } = {},
): Promise<Ingested> {
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image de ${Math.round(input.byteLength / 1024 / 1024)} Mo : la limite est de ${MAX_IMAGE_BYTES / 1024 / 1024} Mo.`,
    )
  }

  const metadata = await describe(input)
  const format = metadata.format ?? ''

  if (format === 'svg') {
    throw new Error(
      'Le SVG est refusé au téléversement : c’est un document XML pouvant porter du script. Un logo vectoriel se dépose dans le dépôt.',
    )
  }

  if (!ACCEPTED.has(format)) {
    throw new Error(
      `Format « ${format || 'inconnu'} » refusé : les images acceptées sont ${[...ACCEPTED].join(', ')}.`,
    )
  }

  const key = createHash('sha256').update(input).digest('hex').slice(0, 16)
  const upright = sharp(input, { animated: false }).rotate()
  const natural = await upright.clone().toBuffer({ resolveWithObject: true })

  // La plus grande largeur produite est celle de l’image, plafonnée. Les
  // largeurs intermédiaires sont celles qui lui sont strictement inférieures :
  // une image plus large que le plafond ne redonne donc pas deux fois la même.
  const largest = Math.min(natural.info.width, MAX_WIDTH)
  const widths = [...WIDTHS.filter((width) => width < largest), largest]

  const files: IngestedFile[] = []
  let height = natural.info.height

  for (const width of widths) {
    const rendered = await upright
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true })

    files.push({ name: fileName(key, width), data: rendered.data })

    if (width === largest) height = rendered.info.height
  }

  return {
    key,
    entry: {
      format: 'webp',
      width: largest,
      height,
      widths,
      alt: options.alt ?? {},
    },
    files,
  }
}

async function describe(input: Buffer): Promise<Metadata> {
  try {
    return await sharp(input, { animated: false }).metadata()
  } catch {
    throw new Error(
      'Ce fichier n’est pas une image : le type est lu sur les octets réels, jamais sur l’extension.',
    )
  }
}

export async function storeMedia(
  root: string,
  ingested: Ingested,
): Promise<void> {
  const directory = path.join(root, MEDIA_DIR)

  await mkdir(directory, { recursive: true })

  for (const file of ingested.files) {
    await writeFile(path.join(directory, file.name), file.data)
  }
}
