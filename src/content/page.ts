// Le format d’un fichier de `content/`. L’enveloppe — format, sections,
// identifiants — est vérifiée ici ; les `props` d’une section le sont contre
// le schéma de son bloc, et `meta` contre les champs ci-dessous, qui passent
// par le même DSL que le reste.

import { z } from 'zod'

import { f } from '../fields/define.js'
import type { Translated, Values } from '../fields/types.js'

export const CONTENT_DIR = 'content'
export const CONTENT_FORMAT = 1

export const META_FIELDS = {
  title: f.text({
    label: 'Titre de la page',
    i18n: true,
    required: true,
    max: 60,
  }),
  description: f.textarea({
    label: 'Description',
    i18n: true,
    required: true,
    max: 160,
    rows: 2,
  }),
  // Le format est celui qu’attendent les messageries. Le champ est facultatif :
  // vide, la carte reprend la première image de la page (D124).
  image: f.image({
    label: 'Image de partage',
    ratio: '1200/630',
  }),
}

export type PageBlock = {
  readonly id: string
  readonly type: string
  readonly hidden: Translated<boolean>
  readonly props: Readonly<Record<string, unknown>>
}

export type PageMeta = Values<typeof META_FIELDS>

export type Page = {
  readonly $format: number
  readonly meta: PageMeta
  readonly blocks: readonly PageBlock[]
}

export const ENVELOPE = z.object({
  $format: z.number().int(),
  meta: z.record(z.string(), z.unknown()).default({}),
  blocks: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{2,}$/),
        type: z.string().min(1),
        hidden: z.record(z.string(), z.boolean()).default({}),
        props: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .default([]),
})
