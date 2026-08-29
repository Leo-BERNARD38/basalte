// La lecture d’une valeur traduisible. Un champ absent d’une langue rend une
// chaîne vide plutôt qu’une valeur d’une autre langue : `basalte check` a déjà
// refusé le cas sur une langue en ligne, et une langue en préparation n’est
// pas construite.

import type { Translated } from './types.js'

export function pick(value: Translated<string>, language: string): string {
  return value[language] ?? ''
}
