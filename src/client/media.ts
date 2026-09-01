// Les images de départ d’un site neuf.
//
// Un dépôt fraîchement créé avait une médiathèque vide et un `public/media/`
// réduit à son `.gitkeep` : la première chose que le client voyait de son
// propre site était un emplacement gris. Ces douze images lui donnent un site
// qui ressemble à un site dès la première ouverture, et qu’il remplace à son
// rythme.
//
// Elles ne sont pas recopiées telles quelles : elles passent par `ingest`,
// comme n’importe quel téléversement (invariant 3). Le nom vient donc de
// l’empreinte, les largeurs sont produites d’un coup, et un dépôt neuf ne
// contient rien qu’un téléversement n’aurait pu écrire.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Translated } from '../fields/types.js'
import { ingest, storeMedia } from '../media/ingest.js'
import {
  readManifest,
  writeManifest,
  type MediaManifest,
} from '../media/manifest.js'

export type StarterImage = {
  /** Le fichier livré dans le paquet, sans son dossier. */
  readonly file: string
  readonly alt: string
  /** Le sujet, en pourcentage : le site cadre autour de lui. */
  readonly focal: { readonly x: number; readonly y: number }
}

export const STARTER_MEDIA: readonly StarterImage[] = [
  {
    file: 'hero-atelier.webp',
    alt: 'L’atelier en fin de journée',
    focal: { x: 55, y: 45 },
  },
  {
    file: 'realisation-escalier.webp',
    alt: 'Un escalier à limon central, en chêne massif',
    focal: { x: 50, y: 45 },
  },
  {
    file: 'realisation-cuisine.webp',
    alt: 'Une cuisine en frêne, avec un plan de pierre',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'realisation-portail.webp',
    alt: 'Un portail à deux vantaux, en mélèze',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'portrait-artisan.webp',
    alt: 'Le menuisier dans son atelier',
    focal: { x: 50, y: 35 },
  },
  {
    file: 'actu-volets.webp',
    alt: 'Des volets battants en mélèze',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'actu-atelier.webp',
    alt: 'Un établi et ses copeaux',
    focal: { x: 45, y: 55 },
  },
  {
    file: 'actu-mairie.webp',
    alt: 'Des fenêtres à petits bois',
    focal: { x: 50, y: 45 },
  },
  {
    file: 'texture-chene.webp',
    alt: 'Un détail de chêne huilé',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'texture-beton.webp',
    alt: 'Un mur de béton brut',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'texture-lin.webp',
    alt: 'Une toile de lin écrue',
    focal: { x: 50, y: 50 },
  },
  {
    file: 'texture-ardoise.webp',
    alt: 'L’ardoise d’un toit',
    focal: { x: 50, y: 50 },
  },
]

/** Le dossier des images livrées, à côté de ce module dans le paquet. */
export function starterDirectory(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'media')
}

/**
 * Les douze images posées dans un site, et le manifeste qu’elles produisent.
 * Ce qui s’y trouve déjà est gardé : réingérer la même image rend la même
 * empreinte, donc la même clé.
 */
export async function installStarterMedia(
  root: string,
  languages: readonly string[],
): Promise<MediaManifest> {
  const directory = starterDirectory()
  const manifest: Record<string, unknown> = { ...(await readManifest(root)) }

  for (const image of STARTER_MEDIA) {
    const alt: Record<string, string> = {}

    for (const language of languages) alt[language] = image.alt

    const ingested = await ingest(
      await readFile(path.join(directory, image.file)),
      {
        alt: alt as Translated<string>,
      },
    )

    await storeMedia(root, ingested)

    manifest[ingested.key] = { ...ingested.entry, focal: image.focal }
  }

  const written = manifest as MediaManifest

  await writeManifest(root, written)

  return written
}
