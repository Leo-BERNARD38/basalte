// La description d’interface : ce que le panel lit pour fabriquer un
// formulaire, et ce que `basalte inventory` imprime. Elle sort du même
// descripteur que le schéma Zod, et reste sérialisable en JSON.
//
// Les bornes rendues sont celles que la validation appliquera, pas celles qui
// ont été écrites : `required` relève le minimum à un, et un panel qui
// l’ignorerait laisserait vider ce que l’enregistrement refuse ensuite.

import { minimumOf } from './schema.js'
import type { AnyField, FieldKind, Fields, SelectOption } from './types.js'

export type FieldDescription = {
  readonly name: string
  readonly kind: FieldKind
  readonly label: string
  readonly required: boolean
  readonly i18n: boolean
  readonly min?: number
  readonly max?: number
  readonly rows?: number
  readonly headings?: boolean
  readonly lists?: boolean
  readonly ratio?: string
  readonly external?: boolean
  readonly itemLabel?: string
  readonly options?: readonly SelectOption[]
  readonly fields?: readonly FieldDescription[]
}

export function describeFields(fields: Fields): readonly FieldDescription[] {
  return Object.entries(fields).map(([name, field]) => describe(name, field))
}

function describe(name: string, field: AnyField): FieldDescription {
  return {
    name,
    kind: field.kind,
    label: field.label ?? name,
    required: field.required,
    i18n: 'i18n' in field && field.i18n,
    ...detail(field),
  }
}

function detail(field: AnyField): Partial<FieldDescription> {
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return {
        ...bounds(field),
        ...('rows' in field && field.rows !== undefined
          ? { rows: field.rows }
          : {}),
      }

    case 'richtext':
      return {
        ...(field.max === undefined ? {} : { max: field.max }),
        ...(field.headings === true ? { headings: true } : {}),
        ...(field.lists === true ? { lists: true } : {}),
      }

    case 'image':
      return field.ratio === undefined ? {} : { ratio: field.ratio }

    case 'document':
    case 'date':
      return {}

    case 'url':
      return field.external === undefined ? {} : { external: field.external }

    case 'select':
      return { options: field.options }

    case 'group':
      return { fields: describeFields(field.fields) }

    case 'list':
      return {
        fields: describeFields(field.of),
        ...bounds(field),
        ...(field.itemLabel === undefined
          ? {}
          : { itemLabel: field.itemLabel }),
      }
  }
}

function bounds(field: {
  readonly required: boolean
  readonly min?: number
  readonly max?: number
}): Partial<FieldDescription> {
  const min = minimumOf(field)

  return {
    ...(min === 0 ? {} : { min }),
    ...(field.max === undefined ? {} : { max: field.max }),
  }
}
