// La lecture et l’écriture de la fiche d’entreprise depuis le panel.
//
// Elle suit la mécanique du chrome, qui suit celle d’une page : brouillon brut
// à la lecture, refus d’un contenu invalide à l’enregistrement, commit à chaque
// écriture (D17, D60, D62). Comme lui, elle n’est pas une page — pas de route,
// pas de métadonnées, pas de sections à ajouter — et elle s’ouvre depuis
// « Édition » plutôt que depuis un sixième écran (D63).
//
// Le brouillon prend la forme d’une section unique : le suivi des modifications
// non enregistrées, la confirmation avant de quitter et le refus d’un contenu
// invalide marchent alors sans une ligne de plus.

import path from 'node:path'

import {
  BUSINESS_ENVELOPE,
  BUSINESS_PATH,
  readBusinessFile,
  validateBusiness,
} from '../content/business.js'
import { CONTENT_FORMAT, type PageBlock } from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { writeJsonFile } from '../content/write.js'
import { translationProgress, type Progress } from '../fields/progress.js'
import {
  BUSINESS_ENTRY,
  BUSINESS_FIELDS,
  BUSINESS_TITLE,
} from '../seo/business.js'
import type { Commit } from './pages.js'
import type { ContentIssue } from '../content/report.js'
import { blockingIssues, problemsOf } from './pages.js'

export type BusinessDraft = {
  readonly sections: readonly PageBlock[]
  readonly progress: readonly Progress[]
}

export type BusinessSave =
  | {
      readonly kind: 'saved'
      readonly business: BusinessDraft
      readonly commit: boolean
    }
  | {
      readonly kind: 'refused'
      readonly problems: readonly string[]
      readonly issues: readonly ContentIssue[]
    }

export async function readBusinessDraft(
  root: string,
  schemas: Schemas,
): Promise<BusinessDraft> {
  return draftOf(await readBusinessFile(root), schemas)
}

export async function saveBusiness(
  root: string,
  schemas: Schemas,
  sections: readonly PageBlock[],
  commit: Commit,
): Promise<BusinessSave> {
  const source = {
    $format: CONTENT_FORMAT,
    facts:
      sections.find((section) => section.id === BUSINESS_ENTRY)?.props ?? {},
  }

  const result = validateBusiness({
    source,
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })

  const problems = problemsOf(result.issues)

  if (problems.length > 0) {
    return {
      kind: 'refused',
      problems,
      issues: blockingIssues(result.issues),
    }
  }

  const written = { $format: CONTENT_FORMAT, facts: result.business }

  await writeJsonFile(path.join(root, BUSINESS_PATH), written)

  return {
    kind: 'saved',
    business: draftOf(written, schemas),
    commit: await commit([BUSINESS_PATH], `contenu : ${BUSINESS_TITLE}`),
  }
}

// Le panel lit le brut : une fiche cassée doit rester ouvrable, sinon le seul
// écran capable de la réparer est celui qui refuse de s’afficher.
function draftOf(source: unknown, schemas: Schemas): BusinessDraft {
  const envelope = BUSINESS_ENVELOPE.safeParse(source)
  const props = envelope.success ? envelope.data.facts : {}

  return {
    sections: [{ id: BUSINESS_ENTRY, type: BUSINESS_ENTRY, hidden: {}, props }],
    progress: translationProgress(
      BUSINESS_FIELDS,
      props,
      schemas.site.languages,
    ),
  }
}
