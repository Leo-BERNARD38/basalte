// Le fichier de contenu du chrome : `content/chrome.json`.
//
// Il vit dans `content/` parce qu’il est versionné, édité et fusionné comme
// une page, mais ce n’est pas une page — son nom ne fait aucune route, et
// `readContent` l’écarte au même titre que `media.json` et `documents.json`.
// C’est ce qui évite les trois exceptions qu’une page de chrome aurait
// demandées : dans `getStaticPaths`, dans la liste du panel, et dans le
// sitemap à venir.
//
// Son absence n’est pas une erreur : les emplacements valent alors leurs
// valeurs par défaut, et le menu retombe sur les pages du site. Un site plus
// ancien que cette phase se navigue donc dès sa montée de version, sans
// migration de contenu.
//
// Il porte un `$format`, comme une page, parce qu’il porte du contenu validé
// contre des schémas : celui-ci dérivera, et les migrations le traversent.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import type { BlockRegistry } from '../blocks/define.js'
import { SLOTS, type ChromeContent, type ChromeSlot } from '../chrome/define.js'
import type { Progress } from '../fields/progress.js'
import type { DocumentManifest } from '../media/documents.js'
import type { MediaManifest } from '../media/manifest.js'
import type { Languages } from '../site/languages.js'
import { CONTENT_DIR, CONTENT_FORMAT } from './page.js'
import type { ContentIssue } from './report.js'
import { draftProgress, validateValues } from './validate.js'

export const CHROME_FILE = 'chrome.json'

/** Le chemin dans le dépôt, à barres — c’est celui qu’un commit reçoit. */
export const CHROME_PATH = `${CONTENT_DIR}/${CHROME_FILE}`

/** Le nom sous lequel les messages citent le chrome, à la place d’une page. */
export const CHROME_NAME = 'chrome'

export const CHROME_ENVELOPE = z.object({
  $format: z.number().int(),
  header: z.record(z.string(), z.unknown()).default({}),
  footer: z.record(z.string(), z.unknown()).default({}),
})

export type ChromeValidation = {
  readonly chrome: ChromeContent
  readonly issues: readonly ContentIssue[]
}

/**
 * Le JSON brut du chrome. Un fichier absent rend l’enveloppe vide du format
 * courant : ce sont les `prefault` des champs qui la remplissent ensuite, et
 * non une valeur toute faite écrite ici.
 */
export async function readChromeFile(root: string): Promise<unknown> {
  let raw: string

  try {
    raw = await readFile(path.join(root, CHROME_PATH), 'utf8')
  } catch {
    return { $format: CONTENT_FORMAT }
  }

  try {
    return JSON.parse(raw) as unknown
  } catch (cause) {
    throw new Error(
      `« ${CHROME_PATH} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }
}

export function validateChrome(input: {
  readonly source: unknown
  readonly registry: BlockRegistry
  readonly languages: Languages
  readonly media: MediaManifest
  readonly documents: DocumentManifest
}): ChromeValidation {
  const envelope = CHROME_ENVELOPE.safeParse(input.source)

  if (!envelope.success) {
    return {
      chrome: empty(),
      issues: envelope.error.issues.map((issue) => {
        const field = issue.path.map(String).join(' › ')

        return {
          severity: 'error' as const,
          page: CHROME_NAME,
          ...(field === '' ? {} : { field }),
          message: `structure de fichier invalide (${issue.code})`,
        }
      }),
    }
  }

  const issues: ContentIssue[] = [...formatIssues(envelope.data.$format)]
  const progress: Progress[] = []
  const values: Record<string, Readonly<Record<string, unknown>>> = {}

  for (const slot of SLOTS) {
    const definition = input.registry[slot]

    if (definition === undefined) {
      issues.push({
        severity: 'error',
        page: CHROME_NAME,
        message: `l’emplacement « ${slot} » n’a pas de schéma`,
      })
      values[slot] = {}
      continue
    }

    const result = validateValues({
      name: CHROME_NAME,
      fields: definition.fields,
      values: envelope.data[slot],
      languages: input.languages,
      media: input.media,
      documents: input.documents,
      section: {
        index: SLOTS.indexOf(slot),
        id: slot,
        label: definition.label,
      },
    })

    issues.push(...result.issues)
    progress.push(...result.progress)
    values[slot] = result.values
  }

  issues.push(...draftProgress(CHROME_NAME, progress, input.languages))

  return { chrome: values as ChromeContent, issues }
}

function formatIssues(format: number): readonly ContentIssue[] {
  if (format === CONTENT_FORMAT) return []

  return [
    {
      severity: 'error',
      page: CHROME_NAME,
      message:
        format < CONTENT_FORMAT
          ? `format de contenu ${format}, le socle attend ${CONTENT_FORMAT} — lance « basalte migrate »`
          : `format de contenu ${format}, écrit par un socle plus récent que celui installé`,
    },
  ]
}

function empty(): ChromeContent {
  return Object.fromEntries(SLOTS.map((slot) => [slot, {}])) as Record<
    ChromeSlot,
    Readonly<Record<string, unknown>>
  >
}
