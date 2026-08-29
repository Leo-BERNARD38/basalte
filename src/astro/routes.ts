// Les URL d’un site multilingue : racine pour la langue par défaut, préfixe de
// code de langue pour les autres. Une langue en préparation n’a pas d’URL sur
// le site construit — l’aperçu du panel, lui, la montre : c’est le seul moyen
// de relire une traduction avant de la mettre en ligne.

import type { Languages } from '../site/languages.js'

export function slugFor(route: string, language: string): string | undefined {
  const path = route === '/' ? '' : route.slice(1)
  const slug =
    language === '' ? path : `${language}${path === '' ? '' : `/${path}`}`

  return slug === '' ? undefined : slug
}

export function urlFor(route: string, language: string): string {
  const slug = slugFor(route, language)

  return slug === undefined ? '/' : `/${slug}`
}

export type Target = {
  readonly route: string
  readonly language: string
}

/** Retrouve la page et la langue derrière une URL, langues en préparation comprises. */
export function matchSlug(
  slug: string,
  routes: readonly string[],
  languages: Languages,
): Target | undefined {
  for (const language of languages.all) {
    const prefix = language.code === languages.default.code ? '' : language.code

    for (const route of routes) {
      if ((slugFor(route, prefix) ?? '') === slug) {
        return { route, language: language.code }
      }
    }
  }

  return undefined
}
