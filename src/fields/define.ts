// Les constructeurs du DSL, et la documentation que `basalte inventory` en
// sort. Les deux vivent dans ce fichier et un test interdit qu’ils divergent :
// un type ajouté sans sa ligne de documentation fait échouer la suite.

import { parseRatio } from '../media/ratio.js'
import type {
  DocumentField,
  Fields,
  FieldKind,
  GroupField,
  ImageField,
  ListField,
  RichtextField,
  SelectField,
  SelectOption,
  TextField,
  TextareaField,
  UrlField,
} from './types.js'

type Common = {
  readonly label?: string
  readonly help?: string
  readonly required?: boolean
}

type Translatable = Common & { readonly i18n?: boolean }
type Bounded = { readonly min?: number; readonly max?: number }

type TextOptions = Translatable & Bounded
type TextareaOptions = TextOptions & { readonly rows?: number }
type RichtextOptions = Translatable & {
  readonly max?: number
  readonly headings?: boolean
  readonly lists?: boolean
}
type ImageOptions = Common & { readonly ratio?: string }
type DocumentOptions = Common
type UrlOptions = Common & { readonly external?: boolean }
type SelectOptions = Common & { readonly options: readonly SelectOption[] }
type GroupOptions<S extends Fields> = Common & { readonly fields: S }
type ListOptions<S extends Fields> = Common &
  Bounded & { readonly of: S; readonly itemLabel?: keyof S & string }

type I18n<O> = O extends { readonly i18n: true } ? true : false

function base(options: Common): { required: boolean } {
  return { required: options.required === true }
}

// Le drapeau `i18n` reste un littéral au niveau du type — c’est lui qui donne
// `Translated<string>` plutôt que `string` au composant — alors que l’objet
// construit ne porte qu’un booléen. Les deux se rejoignent ici, et nulle part
// ailleurs.
function prose<F>(
  kind: 'text' | 'textarea' | 'richtext',
  options: Translatable,
): F {
  return {
    ...options,
    ...base(options),
    kind,
    i18n: options.i18n === true,
  } as unknown as F
}

export const f = {
  text<const O extends TextOptions>(options: O = {} as O): TextField<I18n<O>> {
    return prose<TextField<I18n<O>>>('text', options)
  },

  textarea<const O extends TextareaOptions>(
    options: O = {} as O,
  ): TextareaField<I18n<O>> {
    return prose<TextareaField<I18n<O>>>('textarea', options)
  },

  richtext<const O extends RichtextOptions>(
    options: O = {} as O,
  ): RichtextField<I18n<O>> {
    return prose<RichtextField<I18n<O>>>('richtext', options)
  },

  image(options: ImageOptions = {}): ImageField {
    // Un ratio illisible ne se découvre pas au recadrage : il est refusé ici,
    // là où l’erreur nomme encore le champ qui la porte.
    if (
      options.ratio !== undefined &&
      parseRatio(options.ratio) === undefined
    ) {
      throw new Error(
        `« ${options.ratio} » n’est pas des proportions : attendu « 16/9 », deux nombres séparés d’une barre.`,
      )
    }

    return { ...options, ...base(options), kind: 'image' }
  },

  document(options: DocumentOptions = {}): DocumentField {
    return { ...options, ...base(options), kind: 'document' }
  },

  url(options: UrlOptions = {}): UrlField {
    return { ...options, ...base(options), kind: 'url' }
  },

  select(options: SelectOptions): SelectField {
    return { ...options, ...base(options), kind: 'select' }
  },

  group<const S extends Fields>(options: GroupOptions<S>): GroupField<S> {
    return { ...options, ...base(options), kind: 'group' }
  },

  list<const S extends Fields>(options: ListOptions<S>): ListField<S> {
    return { ...options, ...base(options), kind: 'list' }
  },
}

export type FieldTypeDoc = {
  readonly kind: FieldKind
  readonly summary: string
  readonly options: readonly string[]
}

const COMMON = [
  'label — libellé affiché dans le panel',
  'help — phrase d’aide sous le champ',
  'required — refuse une valeur vide',
]

const TRANSLATABLE = 'i18n — une valeur par langue'

export const FIELD_TYPES: readonly FieldTypeDoc[] = [
  {
    kind: 'text',
    summary: 'Une ligne de texte.',
    options: [...COMMON, TRANSLATABLE, 'min, max — bornes en caractères'],
  },
  {
    kind: 'textarea',
    summary: 'Plusieurs lignes de texte, sans mise en forme.',
    options: [
      ...COMMON,
      TRANSLATABLE,
      'min, max — bornes en caractères',
      'rows — hauteur du champ dans le panel',
    ],
  },
  {
    kind: 'richtext',
    summary: 'Markdown restreint : gras, italique, liens.',
    options: [
      ...COMMON,
      TRANSLATABLE,
      'max — borne en caractères',
      'headings — accepte les titres ## et ###, rendus en h2 et h3',
      'lists — accepte les listes à puces et numérotées',
    ],
  },
  {
    kind: 'image',
    summary: 'Une clé de la médiathèque.',
    options: [...COMMON, 'ratio — proportions attendues, par exemple « 16/9 »'],
  },
  {
    kind: 'document',
    summary: 'Une clé de document — un PDF, servi en téléchargement.',
    options: [...COMMON],
  },
  {
    kind: 'url',
    summary: 'Un lien interne ou externe.',
    options: [...COMMON, 'external — n’accepte que http et https'],
  },
  {
    kind: 'select',
    summary: 'Un choix dans une liste fermée.',
    options: [...COMMON, 'options — les valeurs proposées, avec leur libellé'],
  },
  {
    kind: 'group',
    summary: 'Des champs réunis sous un même intitulé.',
    options: [...COMMON, 'fields — les champs du groupe'],
  },
  {
    kind: 'list',
    summary: 'Une suite répétable d’un même groupe de champs.',
    options: [
      ...COMMON,
      'of — les champs d’un élément',
      'min, max — bornes en nombre d’éléments',
      'itemLabel — le champ qui nomme un élément dans le panel',
    ],
  },
]
