// La validation d’un fichier de contenu contre les schémas de ses blocs. Elle
// ne construit rien et n’écrit rien : elle rend des problèmes situés.
//
// Une langue en préparation ne produit que des avertissements — elle
// n’empêche aucune publication (D18).

import type { BlockRegistry } from '../blocks/define.js'
import { translationProgress, type Progress } from '../fields/progress.js'
import { toZod } from '../fields/schema.js'
import { walkValues } from '../fields/walk.js'
import type { Fields } from '../fields/types.js'
import type { MediaManifest } from '../media/manifest.js'
import type { Languages } from '../site/languages.js'
import {
  CONTENT_FORMAT,
  ENVELOPE,
  META_FIELDS,
  type Page,
  type PageBlock,
  type PageMeta,
} from './page.js'
import {
  describeIssue,
  languageName,
  locate,
  type ContentIssue,
} from './report.js'

export type PageValidation = {
  readonly page?: Page
  readonly issues: readonly ContentIssue[]
}

export type ValidateInput = {
  readonly name: string
  readonly source: unknown
  readonly registry: BlockRegistry
  readonly languages: Languages
  readonly media: MediaManifest
}

export function validatePage(input: ValidateInput): PageValidation {
  const { name, registry, languages } = input
  const envelope = ENVELOPE.safeParse(input.source)

  if (!envelope.success) {
    return {
      issues: envelope.error.issues.map((issue) => ({
        severity: 'error',
        page: name,
        field: issue.path.map(String).join(' › ') || undefined,
        message: `structure de fichier invalide (${issue.code})`,
      })),
    }
  }

  const page = envelope.data
  const issues: ContentIssue[] = []

  if (page.$format < CONTENT_FORMAT) {
    issues.push({
      severity: 'error',
      page: name,
      message: `format de contenu ${page.$format}, le socle attend ${CONTENT_FORMAT} — lance « basalte migrate »`,
    })
  } else if (page.$format > CONTENT_FORMAT) {
    issues.push({
      severity: 'error',
      page: name,
      message: `format de contenu ${page.$format}, écrit par un socle plus récent que celui installé`,
    })
  }

  const seen = new Set<string>()

  for (const [index, section] of page.blocks.entries()) {
    if (seen.has(section.id)) {
      issues.push({
        severity: 'error',
        page: name,
        section: {
          index,
          id: section.id,
          label: label(registry, section.type),
        },
        message: `l’identifiant « ${section.id} » est déjà porté par une autre section`,
      })
    }

    seen.add(section.id)
  }

  const progress: Progress[] = []
  const blocks: PageBlock[] = []

  const meta = collect(issues, progress, {
    name,
    fields: META_FIELDS,
    values: page.meta,
    languages,
    media: input.media,
  })

  for (const [index, section] of page.blocks.entries()) {
    const definition = registry[section.type]

    if (definition === undefined) {
      issues.push({
        severity: 'error',
        page: name,
        section: { index, id: section.id, label: section.type },
        message: `« ${section.type} » n’est pas un type de section connu`,
      })
      continue
    }

    blocks.push({
      ...section,
      props: collect(issues, progress, {
        name,
        fields: definition.fields,
        values: section.props,
        languages,
        media: input.media,
        section: { index, id: section.id, label: definition.label },
      }),
    })
  }

  for (const language of languages.draft) {
    const total = sum(progress, language.code, (entry) => entry.total)
    const filled = sum(progress, language.code, (entry) => entry.filled)

    if (total > 0 && filled < total) {
      issues.push({
        severity: 'warning',
        page: name,
        language: language.code,
        message: `${languageName(language.code)} en préparation : ${filled} champs traduits sur ${total}`,
      })
    }
  }

  const failed = issues.some((issue) => issue.severity === 'error')

  return failed
    ? { issues }
    : {
        page: { $format: page.$format, meta: meta as PageMeta, blocks },
        issues,
      }
}

function collect(
  issues: ContentIssue[],
  progress: Progress[],
  input: {
    readonly name: string
    readonly fields: Fields
    readonly values: unknown
    readonly languages: Languages
    readonly media: MediaManifest
    readonly section?: ContentIssue['section']
  },
): Readonly<Record<string, unknown>> {
  const parsed = toZod(input.fields, input.languages).safeParse(input.values)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: 'error',
        page: input.name,
        ...(input.section === undefined ? {} : { section: input.section }),
        ...describeIssue(issue, input.fields),
      })
    }
  }

  progress.push(
    ...translationProgress(input.fields, input.values, input.languages),
  )

  media(issues, input)

  return parsed.success
    ? (parsed.data as Readonly<Record<string, unknown>>)
    : (input.values as Readonly<Record<string, unknown>>)
}

// Une image référencée doit exister dans la médiathèque et porter son texte
// alternatif dans chaque langue en ligne : il est obligatoire au
// téléversement, et le plancher de design.md l’exige sur chaque image.
function media(
  issues: ContentIssue[],
  input: {
    readonly name: string
    readonly fields: Fields
    readonly values: unknown
    readonly languages: Languages
    readonly media: MediaManifest
    readonly section?: ContentIssue['section']
  },
): void {
  walkValues(input.fields, input.values, (field, value, path) => {
    if (field.kind !== 'image') return

    const key = typeof value === 'string' ? value.trim() : ''

    if (key === '') return

    const located = locate(path, input.fields)
    const where = {
      severity: 'error' as const,
      page: input.name,
      ...(input.section === undefined ? {} : { section: input.section }),
      ...(located.labels.length === 0
        ? {}
        : { field: located.labels.join(' › ') }),
    }

    const entry = input.media[key]

    if (entry === undefined) {
      issues.push({
        ...where,
        message: `l’image « ${key} » n’est pas dans la médiathèque`,
      })
      return
    }

    for (const language of input.languages.online) {
      if ((entry.alt[language.code] ?? '').trim() === '') {
        issues.push({
          ...where,
          language: language.code,
          message: 'texte alternatif manquant',
        })
      }
    }
  })
}

function sum(
  progress: readonly Progress[],
  language: string,
  read: (entry: Progress) => number,
): number {
  return progress
    .filter((entry) => entry.language === language)
    .reduce((total, entry) => total + read(entry), 0)
}

function label(registry: BlockRegistry, type: string): string {
  return registry[type]?.label ?? type
}
