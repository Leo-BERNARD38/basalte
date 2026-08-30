// L’émission du schéma Zod depuis les descripteurs. Le schéma dépend du jeu de
// langues : une langue en ligne exige ses traductions, une langue en
// préparation ne bloque rien (D18). C’est le seul endroit du socle où l’i18n
// entre dans un champ.
//
// Aucun message n’est écrit ici : les problèmes remontent en codes Zod, et
// c’est `src/content/` qui les met en français devant le client.
//
// Tout champ absent vaut vide : la sortie de l’analyse porte donc chaque clé,
// et le composant qui la rend n’a jamais à tester une absence. Une valeur
// requise se dit par sa borne basse, pas par la présence de sa clé.
//
// D’où `prefault` partout, et jamais `default` : un défaut est rendu tel quel,
// sans repasser par le schéma, quand une prévaleur le traverse. La nuance porte
// les deux moitiés de la règle — un champ facultatif absent rend le vide, un
// champ requis absent est refusé par sa propre borne, et un groupe absent rend
// ses champs remplis plutôt qu’un objet vide.

import { z } from 'zod'

import type { Languages } from '../site/languages.js'
import { allowedHref } from './href.js'
import type { AnyField, Fields } from './types.js'

type LeafField = Extract<
  AnyField,
  {
    kind:
      'text' | 'textarea' | 'richtext' | 'image' | 'document' | 'url' | 'select'
  }
>

export const TRANSLATION_MISSING = 'translation-missing'

/**
 * Le minimum réellement appliqué : la borne déclarée, relevée à un par
 * `required`. Le panel lit la même fonction, sans quoi il laisserait vider ce
 * que l’enregistrement refuse ensuite.
 */
export function minimumOf(field: {
  readonly required: boolean
  readonly min?: number
}): number {
  return Math.max(field.min ?? 0, field.required ? 1 : 0)
}

export function toZod(fields: Fields, languages: Languages): z.ZodType {
  return objectOf(fields, languages)
}

function objectOf(fields: Fields, languages: Languages): z.ZodType {
  const shape: Record<string, z.ZodType> = {}

  for (const [name, field] of Object.entries(fields)) {
    shape[name] = fieldOf(field, languages)
  }

  return z.object(shape)
}

function fieldOf(field: AnyField, languages: Languages): z.ZodType {
  if (field.kind === 'group') {
    return objectOf(field.fields, languages).prefault({})
  }

  if (field.kind === 'list') {
    let list = z.array(objectOf(field.of, languages))
    const min = minimumOf(field)

    if (min > 0) list = list.min(min)
    if (field.max !== undefined) list = list.max(field.max)

    return list.prefault([])
  }

  if ('i18n' in field && field.i18n) return translatedOf(field, languages)

  return leafOf(field)
}

// Un champ traduisible rempli dans la langue par défaut doit l’être dans
// toutes les langues en ligne ; laissé vide partout, il est simplement
// inutilisé. Une langue en préparation reste optionnelle et sans contrainte.
function translatedOf(field: LeafField, languages: Languages): z.ZodType {
  const shape: Record<string, z.ZodType> = {}

  for (const language of languages.all) {
    shape[language.code] = language.draft
      ? z.string().prefault('')
      : leafOf(field)
  }

  // Les langues inconnues du site sont conservées plutôt que retirées : ce que
  // le panel écrit est ce que l’analyse rend, et une langue retirée de la
  // configuration effacerait sinon sa traduction au premier enregistrement.
  const translated = z
    .object(shape)
    .catchall(z.string())
    .superRefine((value, context) => {
      const reference = value[languages.default.code]

      if (typeof reference !== 'string' || reference.trim() === '') return

      for (const language of languages.online) {
        const translation = value[language.code]

        if (typeof translation !== 'string' || translation.trim() === '') {
          context.addIssue({
            code: 'custom',
            path: [language.code],
            message: TRANSLATION_MISSING,
            params: { rule: TRANSLATION_MISSING },
          })
        }
      }
    })

  return translated.prefault({})
}

function leafOf(field: LeafField): z.ZodType {
  switch (field.kind) {
    case 'select': {
      const values = field.options.map((option) => option.value)

      return field.required
        ? z.enum(values)
        : z.enum([...values, '']).prefault('')
    }

    case 'url':
      return bounded(field.required ? 1 : 0)
        .refine(
          (value) =>
            value === '' || allowedHref(value, field.external === true),
        )
        .prefault('')

    case 'image':
    case 'document':
      return bounded(field.required ? 1 : 0).prefault('')

    case 'richtext':
      return bounded(field.required ? 1 : 0, field.max).prefault('')

    case 'text':
    case 'textarea':
      return bounded(minimumOf(field), field.max).prefault('')
  }
}

function bounded(min: number, max?: number): z.ZodString {
  let schema = z.string()

  if (min > 0) schema = schema.min(min)
  if (max !== undefined) schema = schema.max(max)

  return schema
}
