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
import { readManifest, type MediaManifest } from '../media/manifest.js'
import type { Site } from '../site/define.js'
import { loadSite } from '../site/load.js'
import type { Page } from './page.js'
import { readContent } from './read.js'
import type { ContentIssue } from './report.js'
import { validatePage } from './validate.js'

export type RenderedPage = {
  readonly name: string
  readonly route: string
  readonly page: Page
}

export type Project = {
  readonly site: Site
  readonly sources: readonly BlockSource[]
  readonly registry: BlockRegistry
  readonly media: MediaManifest
  readonly pages: readonly RenderedPage[]
  readonly issues: readonly ContentIssue[]
}

export async function readProject(root: string): Promise<Project> {
  const site = await loadSite(root)
  const sources = await findBlocks(blockRoots(root))
  const registry = await loadRegistry(sources)
  const media = await readManifest(root)
  const files = await readContent(root)

  const pages: RenderedPage[] = []
  const issues: ContentIssue[] = []

  for (const file of files) {
    const result = validatePage({
      name: file.name,
      source: file.source,
      registry,
      languages: site.languages,
      media,
    })

    issues.push(...result.issues)

    if (result.page !== undefined) {
      pages.push({ name: file.name, route: file.route, page: result.page })
    }
  }

  return { site, sources, registry, media, pages, issues }
}

export function errorsOf(
  issues: readonly ContentIssue[],
): readonly ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'error')
}
