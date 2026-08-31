// Le recadrage d’une image, traité comme une ingestion.
//
// Recadrer ne remplace rien : l’originale reste dans la médiathèque, et la
// nouvelle entrée note d’où elle vient et quel cadre a été retenu. C’est ce qui
// permet de recommencer, et ce qui laisse une même photo servir deux fois à
// deux formats — le cas qui casse les solutions simples.
//
// Le découpage part toujours de l’originale, jamais d’un recadrage : recadrer
// une image déjà recadrée reprend sa source et son cadre, si bien qu’aucune
// chaîne ne s’accumule et qu’aucune passe d’encodage ne s’ajoute.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ingest, MEDIA_DIR, type Ingested } from './ingest.js'
import type { MediaManifest } from './manifest.js'
import { pixelBox, type CropBox } from './ratio.js'
import { fileName } from './resolve.js'

/** La clé dont un recadrage doit repartir : la source, ou l’image elle-même. */
export function originOf(manifest: MediaManifest, key: string): string {
  return manifest[key]?.source ?? key
}

export async function cropImage(
  root: string,
  manifest: MediaManifest,
  key: string,
  box: CropBox,
): Promise<Ingested> {
  const origin = originOf(manifest, key)
  const entry = manifest[origin]

  if (entry === undefined) {
    throw new Error(`L’image « ${origin} » n’est pas dans la médiathèque.`)
  }

  // La plus grande dérivée porte exactement les dimensions du manifeste : le
  // cadre exprimé en pourcentage s’y traduit sans autre mesure.
  const input = await readFile(
    path.join(root, MEDIA_DIR, fileName(origin, entry.width)),
  )

  const ingested = await ingest(input, {
    alt: entry.alt,
    crop: pixelBox(entry, box),
  })

  return {
    ...ingested,
    entry: { ...ingested.entry, source: origin, crop: box },
  }
}
