// Les documents vus du panel : téléverser, supprimer.
//
// Le pendant de `library.ts` pour la seule exception à l’invariant 3. Un PDF
// n’est pas ré-encodé — rien ne sait le faire — et c’est `src/media/documents.ts`
// qui pose les conditions à ce prix : type lu sur les octets réels, taille
// plafonnée, nom dérivé de l’empreinte, et servi en pièce jointe.
//
// Un site ne l’accepte que s’il le déclare : sans la capacité `documents`, le
// téléversement est refusé et le panel ne le propose pas.

import { rm } from 'node:fs/promises'
import path from 'node:path'

import type { Schemas } from '../content/project.js'
import {
  acceptDocument,
  DOCUMENTS_PATH,
  DOCUMENT_DIR,
  MAX_DOCUMENT_BYTES,
  readDocuments,
  storeDocument,
  writeDocuments,
  type DocumentEntry,
  type DocumentManifest,
} from '../media/documents.js'
import { documentFileName } from '../media/resolve.js'
import { countMediaUsage, type UsageSource } from '../media/usage.js'
import type { Panel } from './context.js'
import { badRequest, json, withinLength } from './http.js'
import type { Commit } from './pages.js'

const KEY = /^[0-9a-f]{16}$/

const ENVELOPE_SLACK = 64 * 1024

const REFUSED =
  'Ce site n’accepte pas les documents. Déclare « documents » dans les capacités de site.config.ts.'

export type DocumentSummary = DocumentEntry & {
  readonly key: string
  readonly usage: number
}

export function describeDocuments(
  manifest: DocumentManifest,
  pages: readonly UsageSource[],
  schemas: Schemas,
): readonly DocumentSummary[] {
  const usage = countMediaUsage(schemas.registry, pages, 'document')

  return Object.entries(manifest)
    .map(([key, entry]) => ({ ...entry, key, usage: usage.get(key) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function uploadDocument(
  panel: Panel,
  request: Request,
  schemas: Schemas,
  commit: Commit,
): Promise<Response> {
  if (!schemas.site.capabilities.documents) {
    return json({ ok: false, message: REFUSED }, 409)
  }

  if (!withinLength(request, MAX_DOCUMENT_BYTES + ENVELOPE_SLACK)) {
    return json(
      {
        ok: false,
        message: `Document trop lourd : la limite est de ${MAX_DOCUMENT_BYTES / 1024 / 1024} Mo.`,
      },
      413,
    )
  }

  let form

  try {
    form = await request.formData()
  } catch {
    return badRequest()
  }

  const file = form.get('file')

  if (!(file instanceof File)) return badRequest()

  let accepted

  try {
    accepted = acceptDocument(Buffer.from(await file.arrayBuffer()), file.name)
  } catch (cause) {
    return json({ ok: false, message: (cause as Error).message }, 422)
  }

  const manifest = { ...(await readDocuments(panel.root)) }

  await storeDocument(panel.root, accepted)

  manifest[accepted.key] = accepted.entry

  await writeDocuments(panel.root, manifest)
  await commit(
    [DOCUMENTS_PATH, documentPath(accepted.file)],
    `document : ${accepted.key} ajouté`,
  )

  return json({
    ok: true,
    document: { ...accepted.entry, key: accepted.key, usage: 0 },
  })
}

export async function deleteDocument(
  panel: Panel,
  key: string,
  pages: readonly UsageSource[],
  schemas: Schemas,
  commit: Commit,
): Promise<Response> {
  if (!KEY.test(key)) {
    return json({ ok: false, message: 'Document inconnu.' }, 404)
  }

  const manifest = { ...(await readDocuments(panel.root)) }
  const entry = manifest[key]

  if (entry === undefined) {
    return json({ ok: false, message: 'Document inconnu.' }, 404)
  }

  const usage =
    countMediaUsage(schemas.registry, pages, 'document').get(key) ?? 0

  if (usage > 0) {
    return json(
      {
        ok: false,
        message: `Ce document est employé par ${usage} section${usage > 1 ? 's' : ''}. Retire-le d’abord.`,
      },
      409,
    )
  }

  const removed = documentFileName(key)

  await rm(path.join(panel.root, DOCUMENT_DIR, removed), { force: true })

  delete manifest[key]

  await writeDocuments(panel.root, manifest)
  await commit(
    [DOCUMENTS_PATH, documentPath(removed)],
    `document : ${key} supprimé`,
  )

  return json({ ok: true, key })
}

function documentPath(name: string): string {
  return path.join(DOCUMENT_DIR, name)
}
