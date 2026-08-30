// Des valeurs d’exemple tirées d’un jeu de descripteurs. Le banc de blocs s’en
// sert : il rend chaque bloc disponible sans qu’aucun contenu n’ait été écrit
// pour lui, et sans qu’un bloc nouveau demande d’y ajouter quoi que ce soit.
//
// Ce sont des valeurs de mise au point, jamais du contenu : elles ne sont
// produites que sous `astro dev`, et rien ne les écrit dans `content/`.
//
// Le texte vient du libellé du champ — c’est ce qui rend un rendu lisible sans
// inventer de prose, et ce qui montre du même coup si un libellé est trop long
// pour la place qu’il occupe.

import { minimumOf } from './schema.js'
import type { AnyField, Fields } from './types.js'

export type SampleContext = {
  /** Les codes de langue du site, pour les champs traduisibles. */
  readonly languages: readonly string[]
  /** Une clé de la médiathèque, si le site en a une. */
  readonly image?: string
  /** Une clé de document, si le site en a une. */
  readonly document?: string
}

const ITEMS = 3

const SENTENCE =
  'Une phrase d’exemple, assez longue pour montrer où le texte se replie et comment il respire.'

export function sampleValues(
  fields: Fields,
  context: SampleContext,
): Readonly<Record<string, unknown>> {
  const values: Record<string, unknown> = {}

  for (const [name, field] of Object.entries(fields)) {
    values[name] = sampleValue(name, field, context)
  }

  return values
}

function sampleValue(
  name: string,
  field: AnyField,
  context: SampleContext,
): unknown {
  if (field.kind === 'group') return sampleValues(field.fields, context)

  if (field.kind === 'list') {
    const count = Math.max(
      minimumOf(field),
      Math.min(ITEMS, field.max ?? ITEMS),
    )

    return Array.from({ length: count }, () => sampleValues(field.of, context))
  }

  const value = leaf(name, field, context)

  if (!('i18n' in field) || !field.i18n) return value

  return Object.fromEntries(context.languages.map((code) => [code, value]))
}

function leaf(name: string, field: AnyField, context: SampleContext): string {
  const label = field.label ?? name

  switch (field.kind) {
    case 'image':
      return context.image ?? ''

    case 'document':
      return context.document ?? ''

    case 'url':
      return '#'

    case 'select':
      return field.options[0]?.value ?? ''

    case 'richtext':
      return clamp(prose(label, field.headings, field.lists), field.max)

    case 'textarea':
      return clamp(`${label}. ${SENTENCE}`, field.max)

    case 'text':
      return clamp(label, field.max)

    default:
      return ''
  }
}

function prose(
  label: string,
  headings: boolean | undefined,
  lists: boolean | undefined,
): string {
  return [
    `**${label}.** ${SENTENCE}`,
    ...(headings === true
      ? ['', '## Un titre de second rang', '', SENTENCE]
      : []),
    ...(lists === true
      ? ['', '- un premier élément', '- un deuxième élément', '- un troisième']
      : []),
  ].join('\n')
}

function clamp(text: string, max: number | undefined): string {
  return max === undefined || text.length <= max ? text : text.slice(0, max)
}
