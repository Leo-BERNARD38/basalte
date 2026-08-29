// Ce qu’on manipule d’un brouillon sans React : la valeur vide d’un champ, le
// déplacement d’un élément, et la comparaison qui dit s’il reste quelque chose
// à enregistrer.
//
// La valeur vide se déduit de la description du champ, jamais d’une table
// écrite à la main : ajouter un type au DSL n’a rien à changer ici.

import type { FieldDescription } from '../fields/describe.js'
import type { PageBlock } from '../content/page.js'

export type Values = Readonly<Record<string, unknown>>

export type Draft = {
  readonly meta: Values
  readonly blocks: readonly PageBlock[]
}

export function emptyValue(
  field: FieldDescription,
  languages: readonly string[],
): unknown {
  if (field.kind === 'list') return []

  if (field.kind === 'group') {
    return emptyValues(field.fields ?? [], languages)
  }

  if (field.i18n) {
    return Object.fromEntries(languages.map((code) => [code, '']))
  }

  return ''
}

export function emptyValues(
  fields: readonly FieldDescription[],
  languages: readonly string[],
): Values {
  return Object.fromEntries(
    fields.map((field) => [field.name, emptyValue(field, languages)]),
  )
}

export function move<T>(
  items: readonly T[],
  from: number,
  to: number,
): readonly T[] {
  if (from === to) return items
  if (from < 0 || from >= items.length) return items
  if (to < 0 || to >= items.length) return items

  const next = [...items]
  const [moved] = next.splice(from, 1)

  if (moved === undefined) return items

  next.splice(to, 0, moved)

  return next
}

export function replace<T>(
  items: readonly T[],
  index: number,
  item: T,
): readonly T[] {
  return items.map((current, position) => (position === index ? item : current))
}

export function remove<T>(items: readonly T[], index: number): readonly T[] {
  return items.filter((_, position) => position !== index)
}

/** Deux brouillons sont identiques quand leur JSON l’est, clé pour clé. */
export function sameDraft(left: Draft, right: Draft): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** Le texte d’une valeur traduisible, pour la langue affichée. */
export function translated(value: unknown, language: string): string {
  const map = value as Record<string, unknown> | undefined
  const text = map?.[language]

  return typeof text === 'string' ? text : ''
}

export function withLanguage(
  value: unknown,
  language: string,
  text: string,
): Values {
  const map = (value ?? {}) as Values

  return { ...map, [language]: text }
}
