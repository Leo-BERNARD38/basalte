// La lecture et l’écriture du chrome depuis le panel.
//
// Il suit la mécanique d’une page — brouillon brut à la lecture, refus d’un
// contenu invalide à l’enregistrement, commit à chaque écriture (D17, D60,
// D62) — mais il n’en est pas une : il n’a ni route, ni métadonnées, ni
// sections qu’on ajoute ou retire. Ses deux emplacements sont là, toujours les
// mêmes, et le client n’y règle que ce qu’ils affichent.

import path from 'node:path'

import { CHROME_TITLE, SLOTS } from '../chrome/define.js'
import {
  CHROME_ENVELOPE,
  CHROME_PATH,
  readChromeFile,
  validateChrome,
} from '../content/chrome.js'
import { CONTENT_FORMAT, type PageBlock } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { writeJsonFile } from '../content/write.js'
import { translationProgress, type Progress } from '../fields/progress.js'
import type { Commit } from './pages.js'
import { problemsOf } from './pages.js'

export type ChromeDraft = {
  /** Les deux emplacements, dans l’ordre où ils s’affichent. */
  readonly sections: readonly PageBlock[]
  readonly progress: readonly Progress[]
}

export type ChromeSave =
  | {
      readonly kind: 'saved'
      readonly chrome: ChromeDraft
      readonly commit: boolean
    }
  | { readonly kind: 'refused'; readonly problems: readonly string[] }

export async function readChromeDraft(
  root: string,
  schemas: Schemas,
): Promise<ChromeDraft> {
  return draftOf(await readChromeFile(root), schemas)
}

export async function saveChrome(
  root: string,
  schemas: Schemas,
  sections: readonly PageBlock[],
  commit: Commit,
): Promise<ChromeSave> {
  const source = {
    $format: CONTENT_FORMAT,
    ...Object.fromEntries(
      SLOTS.map((slot) => [
        slot,
        sections.find((section) => section.id === slot)?.props ?? {},
      ]),
    ),
  }

  const result = validateChrome({
    source,
    registry: schemas.chrome,
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })

  const problems = problemsOf(result.issues)

  if (problems.length > 0) return { kind: 'refused', problems }

  const written = { $format: CONTENT_FORMAT, ...result.chrome }

  await writeJsonFile(path.join(root, CHROME_PATH), written)

  return {
    kind: 'saved',
    chrome: draftOf(written, schemas),
    commit: await commit([CHROME_PATH], `contenu : ${CHROME_TITLE}`),
  }
}

// Le panel lit le brut : un chrome cassé doit rester ouvrable, sinon le seul
// écran capable de le réparer est celui qui refuse de s’afficher.
function draftOf(source: unknown, schemas: Schemas): ChromeDraft {
  const envelope = CHROME_ENVELOPE.safeParse(source)
  const values = envelope.success ? envelope.data : undefined
  const progress: Progress[] = []
  const sections: PageBlock[] = []

  for (const slot of SLOTS) {
    const props = values?.[slot] ?? {}
    const definition = schemas.chrome[slot]

    if (definition !== undefined) {
      progress.push(
        ...translationProgress(
          definition.fields,
          props,
          schemas.site.languages,
        ),
      )
    }

    sections.push({ id: slot, type: slot, hidden: {}, props })
  }

  return { sections, progress }
}
