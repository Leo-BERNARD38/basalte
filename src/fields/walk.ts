// Le parcours d’un jeu de valeurs guidé par ses descripteurs. Il descend dans
// les groupes et dans les éléments d’une liste, et rend pour chaque champ
// terminal son descripteur, sa valeur et son chemin — le même chemin que
// portent les problèmes Zod.

import type { AnyField, Fields } from './types.js'

export type Visit = (
  field: AnyField,
  value: unknown,
  path: readonly (string | number)[],
) => void

export function walkValues(
  fields: Fields,
  values: unknown,
  visit: Visit,
  path: readonly (string | number)[] = [],
): void {
  const record = values as Record<string, unknown> | undefined

  for (const [name, field] of Object.entries(fields)) {
    const value = record?.[name]
    const here = [...path, name]

    if (field.kind === 'group') {
      walkValues(field.fields, value, visit, here)
    } else if (field.kind === 'list') {
      if (Array.isArray(value)) {
        for (const [index, item] of value.entries()) {
          walkValues(field.of, item, visit, [...here, index])
        }
      }
    } else {
      visit(field, value, here)
    }
  }
}
