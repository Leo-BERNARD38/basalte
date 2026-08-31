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
import type { ChromeContent } from '../chrome/define.js'
import { findChrome } from '../chrome/scan.js'
import { readDocuments, type DocumentManifest } from '../media/documents.js'
import { readManifest, type MediaManifest } from '../media/manifest.js'
import type { BusinessFacts } from '../seo/business.js'
import type { Site } from '../site/define.js'
import { loadSite } from '../site/load.js'
import { readBusinessFile, validateBusiness } from './business.js'
import { CHROME_NAME, readChromeFile, validateChrome } from './chrome.js'
import { unknownLinks } from './links.js'
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
  /** Les deux emplacements du chrome, du socle ou remplacés par le dépôt. */
  readonly chrome: BlockRegistry
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
    readonly chromeSources: readonly BlockSource[]
    readonly chromeContent: ChromeContent
    readonly business: BusinessFacts
  }

async function schemasOf(
  root: string,
  sources: readonly BlockSource[],
  chromeSources: readonly BlockSource[],
): Promise<Schemas> {
  return {
    site: await loadSite(root),
    registry: await loadRegistry(sources),
    chrome: await loadRegistry(chromeSources),
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

/**
 * La fiche d’entreprise du dépôt, relue à chaque appel comme le chrome et les
 * pages : c’est le dernier enregistrement qui compte.
 */
export async function readBusiness(
  root: string,
  schemas: Schemas,
): Promise<{
  readonly business: BusinessFacts
  readonly issues: readonly ContentIssue[]
}> {
  return validateBusiness({
    source: await readBusinessFile(root),
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })
}

/**
 * Le chrome du dépôt, validé contre ses schémas. Le fichier est relu à chaque
 * appel comme les pages le sont : l’aperçu du panel doit montrer le dernier
 * enregistrement, pas ce qui a été lu au démarrage.
 */
export async function readChrome(
  root: string,
  schemas: Schemas,
  routes: readonly string[],
): Promise<{
  readonly chrome: ChromeContent
  readonly issues: readonly ContentIssue[]
}> {
  const result = validateChrome({
    source: await readChromeFile(root),
    registry: schemas.chrome,
    languages: schemas.site.languages,
    media: schemas.media,
    documents: schemas.documents,
  })

  return {
    chrome: result.chrome,
    issues: [
      ...result.issues,
      ...chromeLinkIssues(result.chrome, schemas, routes),
    ],
  }
}

function chromeLinkIssues(
  chrome: ChromeContent,
  schemas: Schemas,
  routes: readonly string[],
): readonly ContentIssue[] {
  return Object.entries(chrome).flatMap(([slot, values]) => {
    const definition = schemas.chrome[slot]

    return definition === undefined
      ? []
      : unknownLinks({
          name: CHROME_NAME,
          fields: definition.fields,
          values,
          routes,
          languages: schemas.site.languages,
          section: { index: 0, id: slot, label: definition.label },
        })
  })
}

export async function readProject(root: string): Promise<Project> {
  const sources = await findBlocks(blockRoots(root))
  const chromeSources = await findChrome(root)
  const schemas = await schemasOf(root, sources, chromeSources)
  const content = await readPages(root, schemas)
  const chrome = await readChrome(
    root,
    schemas,
    content.pages.map((entry) => entry.route),
  )
  const business = await readBusiness(root, schemas)

  return {
    ...schemas,
    sources,
    chromeSources,
    chromeContent: chrome.chrome,
    business: business.business,
    pages: content.pages,
    issues: [...content.issues, ...chrome.issues, ...business.issues],
  }
}

export function errorsOf(
  issues: readonly ContentIssue[],
): readonly ContentIssue[] {
  return issues.filter((issue) => issue.severity === 'error')
}
