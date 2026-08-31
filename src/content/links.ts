// Les liens internes qui ne mènent nulle part.
//
// Le client range son menu depuis le panel, mais les adresses qu’il y écrit ne
// sont vérifiées par rien : une page renommée laisse un lien mort que seul un
// visiteur découvre. La vérification est un avertissement, jamais une erreur —
// un lien vers une page à venir n’est pas une panne, et refuser bloquerait une
// mise en ligne pour un chemin qu’on s’apprête à créer.
//
// Un site multilingue porte les mêmes pages sous plusieurs adresses : les
// formes préfixées sont acceptées au même titre que la nue, sans quoi
// « /en/contact » serait signalé à tort.

import { urlFor } from '../astro/routes.js'
import { walkValues } from '../fields/walk.js'
import type { Fields } from '../fields/types.js'
import type { Languages } from '../site/languages.js'
import { locate, type ContentIssue } from './report.js'

export type LinksInput = {
  readonly name: string
  readonly fields: Fields
  readonly values: unknown
  readonly routes: readonly string[]
  readonly languages: Languages
  readonly section?: ContentIssue['section']
}

export function unknownLinks(input: LinksInput): readonly ContentIssue[] {
  const known = addresses(input.routes, input.languages)
  const issues: ContentIssue[] = []

  walkValues(input.fields, input.values, (field, value, path) => {
    if (field.kind !== 'url') return

    const href = typeof value === 'string' ? value.trim() : ''

    if (!href.startsWith('/') || known.has(href)) return

    const located = locate(path, input.fields)

    issues.push({
      severity: 'warning',
      page: input.name,
      ...(input.section === undefined ? {} : { section: input.section }),
      ...(located.labels.length === 0
        ? {}
        : { field: located.labels.join(' › ') }),
      message: `« ${href} » ne mène à aucune page du site`,
    })
  })

  return issues
}

/** Toutes les adresses qu’une page du site porte, langues comprises. */
function addresses(
  routes: readonly string[],
  languages: Languages,
): ReadonlySet<string> {
  const known = new Set<string>()

  for (const route of routes) {
    for (const language of languages.all) {
      known.add(
        urlFor(
          route,
          language.code === languages.default.code ? '' : language.code,
        ),
      )
    }
  }

  return known
}
