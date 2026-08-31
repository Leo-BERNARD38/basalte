// Le chrome d’un site : ce qui entoure les sections de chaque page.
//
// Un site sans navigation n’est pas un site incomplet, c’est un site cassé —
// le chrome existe donc toujours, et le socle en fournit un. Il est bâti comme
// un bloc : un dossier, un `schema.ts`, le composant du même nom, plus sa
// variante bureau facultative (D104). Mais il n’est pas une section : on ne
// l’ajoute pas à une page, il n’entre pas dans la bibliothèque du panel, et sa
// place ne se réordonne pas.
//
// Deux emplacements, et pas davantage. Un troisième serait une zone du site
// que le client ne saurait pas nommer, et que rien n’oblige à porter.

import type { BlockProps } from '../blocks/define.js'
import type { Fields } from '../fields/types.js'
import type { Site } from '../site/define.js'

export const CHROME_DIR = 'chrome'

export const SLOTS = ['header', 'footer'] as const

/** Le nom sous lequel l’écran d’édition range le chrome dans sa liste. */
export const CHROME_ENTRY = 'chrome'
export const CHROME_TITLE = 'En-tête et pied de page'

export type ChromeSlot = (typeof SLOTS)[number]

export function isSlot(name: string): name is ChromeSlot {
  return (SLOTS as readonly string[]).includes(name)
}

/** Une page telle que le chrome a besoin de la connaître, et rien de plus. */
export type PageEntry = {
  readonly name: string
  readonly route: string
}

// Le chrome reçoit ce qu’un bloc reçoit, plus les trois choses qu’une section
// n’a jamais à connaître : le nom du site, les pages vers lesquelles il mène,
// et la page où le visiteur se trouve.
export type ChromeProps<S extends Fields = Fields> = BlockProps<S> & {
  readonly site: Site
  readonly pages: readonly PageEntry[]
  readonly route: string
}

/** Les valeurs de chaque emplacement, telles que le rendu les consomme. */
export type ChromeContent = Readonly<
  Record<ChromeSlot, Readonly<Record<string, unknown>>>
>
