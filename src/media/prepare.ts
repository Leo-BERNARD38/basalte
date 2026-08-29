// La passe d’ingestion des images déposées à la main dans `public/media/`.
// Elle est idempotente : un fichier déjà produit par l’ingestion porte
// l’empreinte de son contenu dans son nom, et n’est pas repris.
//
// Le panel appellera `ingest` directement au téléversement ; cette passe est
// ce qui fait que la règle vaut aussi pour une image arrivée par git.

import { readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { ingest, isDerivative, MEDIA_DIR, storeMedia } from './ingest.js'
import { readManifest, writeManifest, type MediaManifest } from './manifest.js'

export type PreparedMedia = {
  readonly from: string
  readonly key: string
}

export async function prepareMedia(
  root: string,
): Promise<readonly PreparedMedia[]> {
  const directory = path.join(root, MEDIA_DIR)
  const entries = await list(directory)
  const pending = entries.filter((name) => !isDerivative(name))

  if (pending.length === 0) return []

  const manifest: Record<string, MediaManifest[string]> = {
    ...(await readManifest(root)),
  }
  const prepared: PreparedMedia[] = []

  for (const name of pending) {
    const file = path.join(directory, name)
    const result = await ingest(await readFile(file))
    const previous = manifest[result.key]

    await storeMedia(root, result)
    await rm(file)

    manifest[result.key] =
      previous === undefined
        ? result.entry
        : { ...result.entry, alt: previous.alt, ...focal(previous) }

    prepared.push({ from: name, key: result.key })
  }

  await writeManifest(root, manifest)

  return prepared
}

function focal(
  entry: MediaManifest[string],
): Pick<MediaManifest[string], 'focal'> | Record<string, never> {
  return entry.focal === undefined ? {} : { focal: entry.focal }
}

async function list(directory: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })

    // Un fichier caché n’est pas une image déposée : `.gitkeep` tient le
    // dossier dans git, et `.DS_Store` s’y invite tout seul.
    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}
