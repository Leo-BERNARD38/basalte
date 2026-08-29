// Les descripteurs de champs. Ce sont des données pures, sérialisables : un
// même descripteur produit le schéma Zod (schema.ts), la description
// d’interface (describe.ts) et le type consommé par le composant. Rien d’autre
// ne garantit que ces trois sorties restent d’accord.
//
// Seule la prose se traduit — text, textarea, richtext. Une clé de média, une
// URL ou une valeur de liste déroulante n’ont pas de version par langue, et un
// groupe comme une liste gardent une structure partagée entre langues.

export type Translated<T> = Readonly<Record<string, T>>

// Interface plutôt qu’alias : la résolution différée d’une interface est ce
// qui casse le cycle Fields → AnyField → GroupField → Fields.
export interface Fields {
  readonly [name: string]: AnyField
}

type Base = {
  readonly label?: string
  readonly help?: string
  readonly required: boolean
}

export type TextField<I extends boolean = boolean> = Base & {
  readonly kind: 'text'
  readonly i18n: I
  readonly min?: number
  readonly max?: number
}

export type TextareaField<I extends boolean = boolean> = Base & {
  readonly kind: 'textarea'
  readonly i18n: I
  readonly min?: number
  readonly max?: number
  readonly rows?: number
}

export type RichtextField<I extends boolean = boolean> = Base & {
  readonly kind: 'richtext'
  readonly i18n: I
  readonly max?: number
}

export type ImageField = Base & {
  readonly kind: 'image'
  readonly ratio?: string
}

export type UrlField = Base & {
  readonly kind: 'url'
  readonly external?: boolean
}

export type SelectOption = {
  readonly value: string
  readonly label: string
}

export type SelectField = Base & {
  readonly kind: 'select'
  readonly options: readonly SelectOption[]
}

export type GroupField<S extends Fields = Fields> = Base & {
  readonly kind: 'group'
  readonly fields: S
}

export type ListField<S extends Fields = Fields> = Base & {
  readonly kind: 'list'
  readonly of: S
  readonly min?: number
  readonly max?: number
  readonly itemLabel?: keyof S & string
}

export type AnyField =
  | TextField
  | TextareaField
  | RichtextField
  | ImageField
  | UrlField
  | SelectField
  | GroupField
  | ListField

export type TranslatableField =
  TextField<true> | TextareaField<true> | RichtextField<true>

export type Value<F> =
  F extends GroupField<infer S>
    ? Values<S>
    : F extends ListField<infer S>
      ? readonly Values<S>[]
      : F extends { readonly i18n: true }
        ? Translated<string>
        : string

export type Values<S extends Fields> = {
  readonly [Name in keyof S]: Value<S[Name]>
}

export type FieldKind = AnyField['kind']
