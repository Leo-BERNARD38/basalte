// Le fichier de contenu de la fiche d’entreprise : `content/business.json`.
//
// Comme `chrome.json`, il vit dans `content/` parce qu’il est versionné, édité
// et fusionné comme une page, sans en être une : son nom ne fait aucune route,
// et `readContent` l’écarte au même titre que `media.json`, `documents.json` et
// `chrome.json`. C’est ce qui lui évite les exceptions qu’une page demanderait
// dans `getStaticPaths`, dans la liste du panel et dans le sitemap.
//
// Son absence n’est pas une erreur : un site sans fiche n’émet simplement
// aucune donnée structurée locale. Un site plus ancien que cette phase se
// construit donc sans migration de contenu.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import type { Progress } from '../fields/progress.js'
import type { DocumentManifest } from '../media/documents.js'
import type { MediaManifest } from '../media/manifest.js'
import {
  BUSINESS_ENTRY,
  BUSINESS_FIELDS,
  BUSINESS_TITLE,
  type BusinessFacts,
} from '../seo/business.js'
import type { Languages } from '../site/languages.js'

import { CONTENT_DIR, CONTENT_FORMAT } from './page.js'
import type { ContentIssue } from './report.js'
import { draftProgress, validateValues } from './validate.js'

export const BUSINESS_FILE = 'business.json'

/** Le chemin dans le dépôt, à barres — c’est celui qu’un commit reçoit. */
export const BUSINESS_PATH = `${CONTENT_DIR}/${BUSINESS_FILE}`

/** Le nom sous lequel les messages citent la fiche, à la place d’une page. */
export const BUSINESS_NAME = 'fiche'

export const BUSINESS_ENVELOPE = z.object({
  $format: z.number().int(),
  facts: z.record(z.string(), z.unknown()).default({}),
})

export type BusinessValidation = {
  readonly business: BusinessFacts
  readonly issues: readonly ContentIssue[]
}

export async function readBusinessFile(root: string): Promise<unknown> {
  let raw: string

  try {
    raw = await readFile(path.join(root, BUSINESS_PATH), 'utf8')
  } catch {
    return { $format: CONTENT_FORMAT }
  }

  try {
    return JSON.parse(raw) as unknown
  } catch (cause) {
    throw new Error(
      `« ${BUSINESS_PATH} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }
}

export function validateBusiness(input: {
  readonly source: unknown
  readonly languages: Languages
  readonly media: MediaManifest
  readonly documents: DocumentManifest
}): BusinessValidation {
  const envelope = BUSINESS_ENVELOPE.safeParse(input.source)

  if (!envelope.success) {
    return {
      business: empty(input),
      issues: envelope.error.issues.map((issue) => {
        const field = issue.path.map(String).join(' › ')

        return {
          severity: 'error' as const,
          page: BUSINESS_NAME,
          ...(field === '' ? {} : { field }),
          message: `structure de fichier invalide (${issue.code})`,
        }
      }),
    }
  }

  const issues: ContentIssue[] = [...formatIssues(envelope.data.$format)]
  const progress: Progress[] = []

  const result = validateValues({
    name: BUSINESS_NAME,
    fields: BUSINESS_FIELDS,
    values: envelope.data.facts,
    languages: input.languages,
    media: input.media,
    documents: input.documents,
    section: { index: 0, id: BUSINESS_ENTRY, label: BUSINESS_TITLE },
  })

  issues.push(...result.issues)
  progress.push(...result.progress)
  issues.push(...draftProgress(BUSINESS_NAME, progress, input.languages))

  return { business: result.values as BusinessFacts, issues }
}

function formatIssues(format: number): readonly ContentIssue[] {
  if (format === CONTENT_FORMAT) return []

  return [
    {
      severity: 'error',
      page: BUSINESS_NAME,
      message:
        format < CONTENT_FORMAT
          ? `format de contenu ${format}, le socle attend ${CONTENT_FORMAT} — lance « basalte migrate »`
          : `format de contenu ${format}, écrit par un socle plus récent que celui installé`,
    },
  ]
}

// Une fiche illisible rend les champs remplis de leurs valeurs par défaut,
// jamais un objet vide : le rendu lit `facts.address.city` sans se demander si
// le fichier existait.
function empty(input: {
  readonly languages: Languages
  readonly media: MediaManifest
  readonly documents: DocumentManifest
}): BusinessFacts {
  return validateValues({
    name: BUSINESS_NAME,
    fields: BUSINESS_FIELDS,
    values: {},
    languages: input.languages,
    media: input.media,
    documents: input.documents,
  }).values as BusinessFacts
}
