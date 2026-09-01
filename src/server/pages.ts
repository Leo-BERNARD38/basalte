// La lecture et l’écriture d’une page depuis le panel.
//
// Le panel lit le contenu **brut** et non le contenu validé : une page cassée
// doit rester ouvrable, sinon le seul écran capable de la réparer est celui
// qui refuse de s’afficher.
//
// Un enregistrement invalide, lui, est refusé. Enregistrer produit un commit,
// et un commit dont le contenu ne se construit pas ferait échouer la mise en
// ligne suivante sans que le client sache pourquoi.

import path from 'node:path'

import {
  CONTENT_DIR,
  CONTENT_FORMAT,
  ENVELOPE,
  META_FIELDS,
  type PageBlock,
} from '../content/page.js'
import type { Schemas } from '../content/project.js'
import { routeOf } from '../content/naming.js'
import { readContent, type ContentFile } from '../content/read.js'
import { renderIssue, type ContentIssue } from '../content/report.js'
import { validatePage } from '../content/validate.js'
import { writeJsonFile } from '../content/write.js'
import {
  totalProgress,
  translationProgress,
  type Progress,
} from '../fields/progress.js'

export type DraftPage = {
  readonly name: string
  readonly route: string
  /** Ce que le client lit dans la liste des pages. */
  readonly title: string
  readonly meta: Readonly<Record<string, unknown>>
  readonly blocks: readonly PageBlock[]
  readonly progress: readonly Progress[]
}

export type PageDraft = {
  readonly meta: Readonly<Record<string, unknown>>
  readonly blocks: readonly PageBlock[]
}

export type SaveResult =
  | {
      readonly kind: 'saved'
      readonly page: DraftPage
      readonly commit: boolean
    }
  | {
      readonly kind: 'refused'
      readonly problems: readonly string[]
      readonly issues: readonly ContentIssue[]
    }

export type Commit = (
  files: readonly string[],
  message: string,
) => Promise<boolean>

export function pageFile(root: string, name: string): string {
  return path.join(root, CONTENT_DIR, `${name}.json`)
}

export function pagePath(name: string): string {
  return `${CONTENT_DIR}/${name}.json`
}

/** Les pages telles qu’elles sont sur le disque, sans passer par les schémas. */
export async function readDrafts(
  root: string,
  schemas: Schemas,
): Promise<readonly DraftPage[]> {
  return draftsFrom(await readContent(root), schemas)
}

/** La même chose depuis des fichiers déjà lus, quand l’appelant en fait deux usages. */
export function draftsFrom(
  files: readonly ContentFile[],
  schemas: Schemas,
): readonly DraftPage[] {
  const drafts: DraftPage[] = []

  for (const file of files) {
    const envelope = ENVELOPE.safeParse(file.source)

    if (envelope.success) {
      drafts.push(draftOf(file.name, envelope.data, schemas))
    }
  }

  return drafts
}

export async function savePage(
  root: string,
  schemas: Schemas,
  name: string,
  draft: PageDraft,
  commit: Commit,
): Promise<SaveResult> {
  const result = validatePage({
    name,
    source: { $format: CONTENT_FORMAT, meta: draft.meta, blocks: draft.blocks },
    registry: schemas.registry,
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })

  if (result.page === undefined) {
    return {
      kind: 'refused',
      problems: problemsOf(result.issues),
      issues: blockingIssues(result.issues),
    }
  }

  const written = {
    $format: CONTENT_FORMAT,
    meta: result.page.meta,
    blocks: result.page.blocks,
  }

  await writeJsonFile(pageFile(root, name), written)

  const page = draftOf(name, written, schemas)

  return {
    kind: 'saved',
    page,
    commit: await commit([pagePath(name)], `contenu : ${page.title}`),
  }
}

export function problemsOf(issues: readonly ContentIssue[]): readonly string[] {
  return blockingIssues(issues).map((issue) => renderIssue(issue))
}

/**
 * Ce qui empêche d’enregistrer, tel quel. Le panel s’en sert pour poser
 * l’erreur sous le champ qui la cause : le serveur connaît déjà la section, le
 * champ et la langue, et les aplatir en phrases perdait ce qu’il sait.
 */
export function blockingIssues(
  issues: readonly ContentIssue[],
): readonly ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'error')
}

function draftOf(name: string, page: PageDraft, schemas: Schemas): DraftPage {
  const languages = schemas.site.languages
  const parts = [translationProgress(META_FIELDS, page.meta, languages)]

  for (const section of page.blocks) {
    const definition = schemas.registry[section.type]

    if (definition !== undefined) {
      parts.push(
        translationProgress(definition.fields, section.props, languages),
      )
    }
  }

  return {
    name,
    route: routeOf(name),
    title: title(page.meta, languages.default.code) || name,
    meta: page.meta,
    blocks: page.blocks,
    progress: totalProgress(parts.flat()),
  }
}

function title(
  meta: Readonly<Record<string, unknown>>,
  language: string,
): string {
  const value = (meta['title'] as Record<string, unknown> | undefined)?.[
    language
  ]

  return typeof value === 'string' ? value.trim() : ''
}
