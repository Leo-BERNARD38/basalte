// Tout ce qu’il faut savoir d’un dépôt client pour le rendre ou le vérifier :
// sa configuration, ses blocs, ses médias et ses pages validées. Le CLI et
// l’intégration Astro passent par ici — ils n’en font pas le même usage, mais
// ils lisent la même chose, et de la même façon.

import type { BlockRegistry } from '../blocks/define.js'
import {
  blockRoots,
  findBlocks,
  loadRegistry,
  type BlockSource,
} from '../blocks/scan.js'
import { readDocuments, type DocumentManifest } from '../media/documents.js'
import { readManifest, type MediaManifest } from '../media/manifest.js'
import type { Site } from '../site/define.js'
import { loadSite } from '../site/load.js'
import type { Page } from './page.js'
import { readContent, type ContentFile } from './read.js'
import type { ContentIssue } from './report.js'
import { validatePage } from './validate.js'

export type RenderedPage = {
  readonly name: string
  readonly route: string
  readonly page: Page
}

/**
 * Tout ce qui décrit un dépôt, sans son contenu : de quoi valider une page.
 *
 * Les descripteurs de champs étant des données pures, ce jeu se sérialise —
 * c’est ce qui permet au panel de le recevoir tout fait plutôt que de
 * reparcourir les blocs à chaque requête.
 */
export type Schemas = {
  readonly site: Site
  readonly registry: BlockRegistry
  readonly media: MediaManifest
  readonly documents: DocumentManifest
}

export type Content = {
  readonly pages: readonly RenderedPage[]
  readonly issues: readonly ContentIssue[]
}

export type Project = Schemas &
  Content & {
    readonly sources: readonly BlockSource[]
  }

async function schemasOf(
  root: string,
  sources: readonly BlockSource[],
): Promise<Schemas> {
  return {
    site: await loadSite(root),
    registry: await loadRegistry(sources),
    media: await readManifest(root),
    documents: await readDocuments(root),
  }
}

/** Les pages du dépôt, validées contre les schémas donnés. */
export async function readPages(
  root: string,
  schemas: Schemas,
): Promise<Content> {
  return validateFiles(await readContent(root), schemas)
}

/** La même chose depuis des fichiers déjà lus, quand l’appelant en fait deux usages. */
export function validateFiles(
  files: readonly ContentFile[],
  schemas: Schemas,
): Content {
  const pages: RenderedPage[] = []
  const issues: ContentIssue[] = []

  for (const file of files) {
    const result = validatePage({
      name: file.name,
      source: file.source,
      registry: schemas.registry,
      languages: schemas.site.languages,
      media: schemas.media,
      documents: schemas.documents,
    })

    issues.push(...result.issues)

    if (result.page !== undefined) {
      pages.push({ name: file.name, route: file.route, page: result.page })
    }
  }

  return { pages, issues }
}

export async function readProject(root: string): Promise<Project> {
  const sources = await findBlocks(blockRoots(root))
  const schemas = await schemasOf(root, sources)

  return { ...schemas, sources, ...(await readPages(root, schemas)) }
}

export function errorsOf(
  issues: readonly ContentIssue[],
): readonly ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'error')
}
