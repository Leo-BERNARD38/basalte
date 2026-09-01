// La mise en français d’un problème de contenu. Les schémas n’écrivent aucun
// message : ils rendent des codes Zod, et c’est ici qu’ils deviennent une
// phrase qui nomme la page, la section et le champ (D25).

import type { core } from 'zod'

import { TRANSLATION_MISSING } from '../fields/schema.js'
import type { AnyField, Fields } from '../fields/types.js'

export type ContentIssue = {
  readonly severity: 'error' | 'warning'
  readonly page: string
  readonly section?: {
    readonly index: number
    readonly id: string
    readonly label: string
  }
  /** Le chemin lisible : les libellés, tels qu’un message les cite. */
  readonly field?: string
  /**
   * Le chemin machine, tel que le panel le suit jusqu’au champ fautif. `field`
   * ne sert qu’à écrire une phrase : deux champs peuvent porter le même
   * libellé, et un rang d’élément n’a pas de nom.
   */
  readonly path?: readonly (string | number)[]
  readonly language?: string
  readonly message: string
}

const LANGUAGE_NAMES = new Intl.DisplayNames(['fr'], { type: 'language' })

export function languageName(code: string): string {
  return LANGUAGE_NAMES.of(code) ?? code
}

export function describeIssue(
  issue: core.$ZodIssue,
  fields: Fields,
): {
  readonly field?: string
  readonly path?: readonly (string | number)[]
  readonly language?: string
  message: string
} {
  const located = locate(issue.path, fields)
  const path = machinePath(issue.path)

  return {
    ...(located.labels.length === 0
      ? {}
      : { field: located.labels.join(' › ') }),
    ...(path.length === 0 ? {} : { path }),
    ...(located.language === undefined ? {} : { language: located.language }),
    message: messageFor(issue, located.field, located.language !== undefined),
  }
}

/**
 * Le chemin réduit à ce qui traverse le JSON : Zod le donne en `PropertyKey`,
 * et un symbole n’arriverait jamais jusqu’au navigateur.
 */
function machinePath(
  path: readonly PropertyKey[],
): readonly (string | number)[] {
  return path
    .filter((segment) => typeof segment !== 'symbol')
    .map((segment) => (typeof segment === 'number' ? segment : String(segment)))
}

export function renderIssue(issue: ContentIssue): string {
  return `${issuePlace(issue)} : ${issue.message}`
}

/**
 * L’endroit que le problème désigne, sans le reproche : la page, puis ce qui
 * s’y trouve. Le terminal les recolle en une ligne ; le panel groupe par la
 * page et met le reste en dessous, et c’est pourquoi les deux ne partagent
 * que ces deux fonctions.
 */
export function issuePlace(issue: ContentIssue): string {
  const detail = issueDetail(issue)

  return detail === '' ? issue.page : `${issue.page} › ${detail}`
}

/** Sous la page : la section, puis le champ. Vide, la page entière est visée. */
export function issueDetail(issue: ContentIssue): string {
  const parts: string[] = []

  if (issue.section !== undefined) {
    parts.push(`section ${issue.section.index + 1} « ${issue.section.label} »`)
  }

  if (issue.field !== undefined) {
    parts.push(
      issue.language === undefined
        ? issue.field
        : `${issue.field} (${languageName(issue.language)})`,
    )
  }

  return parts.join(' › ')
}

function messageFor(
  issue: core.$ZodIssue,
  field: AnyField | undefined,
  translated: boolean,
): string {
  const list = field?.kind === 'list'

  switch (issue.code) {
    case 'too_big':
      return list
        ? `ne peut pas compter plus de ${issue.maximum} éléments`
        : `dépasse ${issue.maximum} caractères`

    case 'too_small':
      if (Number(issue.minimum) <= 1) {
        return list ? 'demande au moins un élément' : 'doit être rempli'
      }

      return list
        ? `demande au moins ${issue.minimum} éléments`
        : `demande au moins ${issue.minimum} caractères`

    case 'invalid_type':
      return translated ? 'traduction manquante' : 'est absent'

    case 'invalid_value':
      return 'n’est pas une valeur proposée'

    case 'custom':
      if (issue.params?.['rule'] === TRANSLATION_MISSING) {
        return 'traduction manquante'
      }

      if (field?.kind === 'url') return 'n’est pas un lien valide'
      if (field?.kind === 'date')
        return 'n’est pas une date : attendu AAAA-MM-JJ'

      return 'est invalide'

    default:
      return 'est invalide'
  }
}

// Un chemin se relit contre les descripteurs : chaque segment donne un
// libellé, un indice d’élément, ou le code de la langue fautive.
export function locate(
  path: readonly PropertyKey[],
  fields: Fields,
): {
  readonly labels: readonly string[]
  readonly field?: AnyField
  readonly language?: string
} {
  const labels: string[] = []
  let scope: Fields | undefined = fields
  let field: AnyField | undefined
  let language: string | undefined

  for (const segment of path) {
    if (typeof segment === 'number') {
      labels.push(`élément ${segment + 1}`)
      continue
    }

    const name = String(segment)
    const next: AnyField | undefined = scope?.[name]

    if (next === undefined) {
      if (field !== undefined && 'i18n' in field && field.i18n) language = name
      continue
    }

    field = next
    labels.push(next.label ?? name)
    scope =
      next.kind === 'group'
        ? next.fields
        : next.kind === 'list'
          ? next.of
          : undefined
  }

  return {
    labels,
    ...(field === undefined ? {} : { field }),
    ...(language === undefined ? {} : { language }),
  }
}
