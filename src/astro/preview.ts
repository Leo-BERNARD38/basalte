// Ce que l’aperçu doit rendre, décidé hors du composant : la page, sa langue,
// son support, ou la réponse qui arrête là.
//
// L’aperçu montre le dépôt tel qu’il est — enregistré mais pas encore en
// ligne — et il montre aussi les langues en préparation, absentes du site
// construit. C’est le seul endroit où une traduction se relit avant de sortir.
//
// Le support, lui, est demandé plutôt que deviné : la bascule de l’écran
// d’édition (D96) le nomme dans l’adresse. Un site à un seul rendu retombe
// toujours sur le mobile, quoi qu’on lui demande — l’aperçu ne peut pas montrer
// un rendu que la mise en ligne ne produirait pas.

import type { ChromeContent, PageEntry } from '../chrome/define.js'
import {
  readBusiness,
  readChrome,
  readPages,
  type RenderedPage,
  type Schemas,
} from '../content/project.js'
import { renderIssue } from '../content/report.js'
import { allPages, postEntries, type PostEntry } from '../journal/page.js'
import { readJournal } from '../journal/read.js'
import {
  DEFAULT_SUPPORT,
  isSupport,
  SUPPORT_PARAM,
  supportsOf,
  type Support,
} from '../render/supports.js'
import type { BusinessFacts } from '../seo/business.js'
import type { Panel } from '../server/context.js'
import { authenticate, PANEL_PATH } from '../server/handlers.js'
import { matchSlug } from './routes.js'

export type Preview =
  | {
      readonly kind: 'page'
      readonly entry: RenderedPage
      readonly language: string
      readonly support: Support
      readonly schemas: Schemas
      /** Le chrome enregistré, relu comme les pages le sont. */
      readonly content: ChromeContent
      /** La fiche d’entreprise enregistrée : l’aperçu porte le même JSON-LD. */
      readonly business: BusinessFacts
      readonly pages: readonly PageEntry[]
      /** Les billets visibles dans la langue rendue, comme le site les donne. */
      readonly posts: readonly PostEntry[]
    }
  | { readonly kind: 'stop'; readonly response: Response }

export async function resolvePreview(
  panel: Panel,
  request: Request,
  slug: string,
): Promise<Preview> {
  if (authenticate(panel.server, request) === undefined) {
    return {
      kind: 'stop',
      response: new Response(null, {
        status: 303,
        headers: { location: PANEL_PATH },
      }),
    }
  }

  const schemas = await panel.schemas()
  const { pages, issues } = await readPages(panel.root, schemas)
  const journal = await readJournal(panel.root, schemas)

  // L’aperçu montre aussi les billets : ce sont des pages dont le socle a écrit
  // la structure, et le panel doit pouvoir les relire avant qu’ils paraissent.
  //
  // Un brouillon s’y relit démasqué. `pageOfPost` reporte le `hidden` du billet
  // sur l’unique section de la page compilée : masqué, elle n’a plus rien de
  // visible, et l’aperçu montrait un en-tête et un pied séparés par du vide —
  // au moment précis où l’on écrit le billet. Le masque décide de ce qui part
  // en ligne, pas de ce que son auteur peut relire.
  const served = allPages({
    site: schemas.site,
    pages,
    posts: journal.posts.map((post) => ({ ...post, hidden: {} })),
  })

  const target = matchSlug(
    slug,
    served.map((entry) => entry.route),
    schemas.site.languages,
  )

  const entry =
    target === undefined
      ? undefined
      : served.find((page) => page.route === target.route)

  if (entry === undefined || target === undefined) {
    const errors = [...issues, ...journal.issues]
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `  - ${renderIssue(issue)}`)

    const body = [
      'Cette page n’est pas visible.',
      '',
      ...(errors.length === 0
        ? ['Aucune page ne répond à cette adresse.']
        : ['Le contenu ne passe pas la validation :', ...errors]),
      '',
    ].join('\n')

    return {
      kind: 'stop',
      response: new Response(body, {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }),
    }
  }

  const chrome = await readChrome(
    panel.root,
    schemas,
    served.map((page) => page.route),
  )

  const business = await readBusiness(panel.root, schemas)

  return {
    kind: 'page',
    entry,
    language: target.language,
    support: supportAsked(schemas, request),
    schemas,
    content: chrome.chrome,
    business: business.business,
    pages: pages.map((page) => ({ name: page.name, route: page.route })),
    posts:
      schemas.site.journal === undefined
        ? []
        : postEntries(schemas.site.journal, journal.posts, target.language),
  }
}

function supportAsked(schemas: Schemas, request: Request): Support {
  const asked = new URL(request.url).searchParams.get(SUPPORT_PARAM) ?? ''
  const built = supportsOf(schemas.site)

  return isSupport(asked) && built.includes(asked) ? asked : DEFAULT_SUPPORT
}
