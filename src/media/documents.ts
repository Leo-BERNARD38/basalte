// Les documents téléversables : des PDF, et rien d’autre.
//
// C’est la seule exception à l’invariant 3, et elle est étroite. Une image est
// ré-encodée par sharp, ce qui neutralise ce qu’elle transporte ; rien ne fait
// cela d’un PDF, qui est un format à script. Un document est donc conservé tel
// quel — et il ne compense qu’en ne s’affichant jamais : il est servi en pièce
// jointe, hors du chemin des images, et aucun composant ne l’incruste dans une
// page. Les conditions complètes sont dans `docs/securite.md`.
//
// Comme pour une image, le type est lu sur les octets réels et le nom vient de
// l’empreinte du contenu : ni l’extension ni le nom donné par le visiteur
// n’atteignent le disque.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import { CONTENT_DIR } from '../content/page.js'
import { writeJsonFile } from '../content/write.js'
import { documentFileName } from './resolve.js'

export const DOCUMENT_DIR = path.join('public', 'documents')
export const DOCUMENTS_FILE = 'documents.json'
export const DOCUMENTS_PATH = path.join(CONTENT_DIR, DOCUMENTS_FILE)
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
export const MAX_DOCUMENT_NAME = 120

export type DocumentEntry = {
  /** Le nom que le panel affiche, nettoyé de tout chemin. */
  readonly name: string
  readonly bytes: number
}

export type DocumentManifest = Readonly<Record<string, DocumentEntry>>

export type AcceptedDocument = {
  readonly key: string
  readonly entry: DocumentEntry
  /** Le nom du fichier écrit sur le disque. */
  readonly file: string
  readonly data: Buffer
}

const HEADER = '%PDF-'
export function acceptDocument(input: Buffer, name: string): AcceptedDocument {
  if (input.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Document de ${Math.round(input.byteLength / 1024 / 1024)} Mo : la limite est de ${MAX_DOCUMENT_BYTES / 1024 / 1024} Mo.`,
    )
  }

  if (input.subarray(0, HEADER.length).toString('latin1') !== HEADER) {
    throw new Error(
      'Ce fichier n’est pas un PDF : le type est lu sur les octets réels, jamais sur l’extension.',
    )
  }

  const label = displayName(name)

  if (label === '') {
    throw new Error('Il manque un nom de fichier lisible pour ce document.')
  }

  const key = createHash('sha256').update(input).digest('hex').slice(0, 16)

  return {
    key,
    entry: { name: label, bytes: input.byteLength },
    file: documentFileName(key),
    data: input,
  }
}

// Le nom donné par le visiteur ne sert qu’à l’affichage : il perd son chemin,
// ses caractères de contrôle et sa longueur excessive avant d’entrer au
// manifeste, où il est versionné avec le contenu.
function displayName(name: string): string {
  const last = name.split(/[/\\]/).at(-1) ?? ''

  return [...last]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0

      return code > 0x1f && !(code >= 0x7f && code <= 0x9f)
    })
    .join('')
    .trim()
    .slice(0, MAX_DOCUMENT_NAME)
}

export async function storeDocument(
  root: string,
  accepted: AcceptedDocument,
): Promise<void> {
  const directory = path.join(root, DOCUMENT_DIR)

  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, accepted.file), accepted.data)
}

const ENTRY = z.object({
  name: z.string().min(1).max(MAX_DOCUMENT_NAME),
  bytes: z.number().int().positive(),
})

const MANIFEST = z.record(z.string().regex(/^[0-9a-f]{16}$/), ENTRY)

export async function readDocuments(root: string): Promise<DocumentManifest> {
  let raw

  try {
    raw = await readFile(path.join(root, DOCUMENTS_PATH), 'utf8')
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return {}

    throw cause
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    throw new Error(
      `« ${DOCUMENTS_PATH} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }

  const manifest = MANIFEST.safeParse(parsed)

  if (!manifest.success) {
    const first = manifest.error.issues[0]

    throw new Error(
      `« ${DOCUMENTS_PATH} » ne décrit pas des documents : ${first?.path.join(' › ') || 'racine'} — ${first?.message ?? 'forme inattendue'}.`,
    )
  }

  return manifest.data
}

export async function writeDocuments(
  root: string,
  manifest: DocumentManifest,
): Promise<void> {
  const ordered = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  )

  await writeJsonFile(path.join(root, DOCUMENTS_PATH), ordered)
}
