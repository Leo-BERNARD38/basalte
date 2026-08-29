// Ce que l’aperçu doit rendre, décidé hors du composant : la page, sa langue,
// ou la réponse qui arrête là.
//
// L’aperçu montre le dépôt tel qu’il est — enregistré mais pas encore en
// ligne — et il montre aussi les langues en préparation, absentes du site
// construit. C’est le seul endroit où une traduction se relit avant de sortir.

import {
  readPages,
  type RenderedPage,
  type Schemas,
} from '../content/project.js'
import { renderIssue } from '../content/report.js'
import type { Panel } from '../server/context.js'
import { authenticate, PANEL_PATH } from '../server/handlers.js'
import { matchSlug } from './routes.js'

export type Preview =
  | {
      readonly kind: 'page'
      readonly entry: RenderedPage
      readonly language: string
      readonly schemas: Schemas
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

  const target = matchSlug(
    slug,
    pages.map((entry) => entry.route),
    schemas.site.languages,
  )

  const entry =
    target === undefined
      ? undefined
      : pages.find((page) => page.route === target.route)

  if (entry === undefined || target === undefined) {
    const errors = issues
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

  return { kind: 'page', entry, language: target.language, schemas }
}
