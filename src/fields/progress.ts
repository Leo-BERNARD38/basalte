// L’avancement des traductions. Zod ne sait pas dire « douze champs sur
// quarante » : il bloque ou il laisse passer. Ce parcours des descripteurs le
// dit, et sert à la fois les avertissements de `basalte check` sur une langue
// en préparation et l’indicateur du panel.
//
// Un champ vide dans la langue par défaut ne compte pas : il n’est pas à
// traduire, il est inutilisé.

import type { Languages } from '../site/languages.js'
import type { Fields } from './types.js'
import { walkValues } from './walk.js'

export type Progress = {
  readonly language: string
  readonly filled: number
  readonly total: number
}

export function translationProgress(
  fields: Fields,
  values: unknown,
  languages: Languages,
): readonly Progress[] {
  const others = languages.all.filter(
    (language) => language.code !== languages.default.code,
  )
  const counts = new Map(others.map((language) => [language.code, 0]))
  let total = 0

  walkValues(fields, values, (field, value) => {
    if (!('i18n' in field) || !field.i18n) return
    if (text(value, languages.default.code) === '') return

    total += 1

    for (const language of others) {
      if (text(value, language.code) !== '') {
        counts.set(language.code, (counts.get(language.code) ?? 0) + 1)
      }
    }
  })

  return others.map((language) => ({
    language: language.code,
    filled: counts.get(language.code) ?? 0,
    total,
  }))
}

function text(translated: unknown, language: string): string {
  const value = (translated as Record<string, unknown> | undefined)?.[language]

  return typeof value === 'string' ? value.trim() : ''
}

/** Regroupe par langue plusieurs avancements partiels — une page, ses sections. */
export function totalProgress(
  entries: readonly Progress[],
): readonly Progress[] {
  const totals = new Map<string, { filled: number; total: number }>()

  for (const entry of entries) {
    const current = totals.get(entry.language) ?? { filled: 0, total: 0 }

    totals.set(entry.language, {
      filled: current.filled + entry.filled,
      total: current.total + entry.total,
    })
  }

  return [...totals].map(([language, counts]) => ({ language, ...counts }))
}
