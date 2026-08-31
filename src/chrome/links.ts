// Les liens que le chrome affiche, calculés hors des templates : une valeur
// lue seulement dans un `return` de frontmatter `.astro` est vue comme
// inutilisée par `astro check`, et une règle écrite dans un template ne se
// teste pas.
//
// Une liste vide ne veut pas dire « pas de menu ». Elle veut dire « personne
// n’a encore rangé le menu » : l’en-tête reprend alors les pages du site, ce
// qui fait qu’un site plus ancien que cette phase se navigue dès sa montée de
// version. Le pied de page, lui, ne devine rien — des liens légaux ne se
// déduisent pas d’une liste de fichiers.
//
// Un lien interne est écrit tel que le client le lit — « /contact » — et gagne
// son préfixe de langue au rendu, par la même fonction que `getStaticPaths`
// (`src/astro/routes.ts`) : l’adresse d’une page n’a qu’une source.

import { urlFor } from '../astro/routes.js'
import { isServiceRoute, pageLabel } from '../content/naming.js'
import { pick } from '../fields/translate.js'
import type { Translated } from '../fields/types.js'
import type { PageEntry } from './define.js'

/** Un lien tel qu’un champ de liste le porte. */
export type LinkValue = {
  readonly label: Translated<string>
  readonly href: string
}

export type NavigationLink = {
  readonly label: string
  readonly href: string
  /** La page où le visiteur se trouve, pour `aria-current`. */
  readonly current: boolean
}

export type NavigationInput = {
  readonly links: readonly LinkValue[]
  readonly pages: readonly PageEntry[]
  readonly language: string
  /** Le préfixe d’URL de la langue rendue : vide pour celle par défaut. */
  readonly prefix: string
  /** La route de la page rendue. */
  readonly route: string
  /** Ce que rend une liste vide. */
  readonly whenEmpty: 'pages' | 'nothing'
}

export function navigationLinks(
  input: NavigationInput,
): readonly NavigationLink[] {
  const declared = input.links
    .map((link) => ({
      label: pick(link.label, input.language),
      href: link.href.trim(),
    }))
    .filter((link) => link.label !== '' && link.href !== '')

  const entries =
    declared.length > 0
      ? declared
      : input.whenEmpty === 'pages'
        ? derived(input.pages)
        : []

  return entries.map((entry) => {
    const page = input.pages.find((candidate) => candidate.route === entry.href)

    return {
      label: entry.label,
      href: page === undefined ? entry.href : urlFor(page.route, input.prefix),
      current: page !== undefined && page.route === input.route,
    }
  })
}

// L’accueil ouvre le menu ; le reste suit l’ordre des fichiers, qui est celui
// de la liste du panel. Les pages de service n’y entrent pas : on n’envoie
// personne remercier avant d’avoir écrit.
function derived(
  pages: readonly PageEntry[],
): readonly { readonly label: string; readonly href: string }[] {
  return [...pages]
    .filter((page) => !isServiceRoute(page.route))
    .sort((a, b) => Number(b.route === '/') - Number(a.route === '/'))
    .map((page) => ({ label: pageLabel(page.name), href: page.route }))
}
