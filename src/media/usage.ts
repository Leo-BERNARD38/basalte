// Les médias référencés par le contenu. Trois besoins s’en servent : le panel
// refuse de supprimer une image ou un document encore employé, `basalte check`
// signale ceux que plus rien n’emploie, et le même parcours dit si une image
// tient le format que son emplacement déclare.

import type { BlockRegistry } from '../blocks/define.js'
import { META_FIELDS, type PageBlock } from '../content/page.js'
import { walkValues } from '../fields/walk.js'
import type { ContentIssue } from '../content/report.js'
import type { MediaManifest } from './manifest.js'
import { matchesRatio } from './ratio.js'

export type MediaUsage = ReadonlyMap<string, number>

export type UsageSource = {
  readonly meta: unknown
  readonly blocks: readonly PageBlock[]
}

export function countMediaUsage(
  registry: BlockRegistry,
  pages: readonly UsageSource[],
  kind: 'image' | 'document' = 'image',
): MediaUsage {
  const counts = new Map<string, number>()

  const tally = (fields: Parameters<typeof walkValues>[0], values: unknown) => {
    walkValues(fields, values, (field, value) => {
      if (field.kind !== kind) return

      const key = typeof value === 'string' ? value.trim() : ''

      if (key !== '') counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  }

  for (const page of pages) {
    tally(META_FIELDS, page.meta)

    for (const section of page.blocks) {
      const definition = registry[section.type]

      if (definition !== undefined) tally(definition.fields, section.props)
    }
  }

  return counts
}

/**
 * Les emplois, augmentés de ceux qu’un recadrage vaut à son originale. Sans
 * cette règle, une image dont seul le recadrage est en ligne passerait pour
 * orpheline, et le panel accepterait de supprimer ce dont il faut repartir
 * pour recadrer à nouveau.
 */
export function withLineage(
  usage: MediaUsage,
  manifest: MediaManifest,
): MediaUsage {
  const counts = new Map(usage)

  for (const [key, entry] of Object.entries(manifest)) {
    const origin = entry.source

    if (origin === undefined) continue

    const derived = counts.get(key) ?? 0

    if (derived > 0) counts.set(origin, (counts.get(origin) ?? 0) + derived)
  }

  return counts
}

export type RatioSource = UsageSource & { readonly name: string }

/**
 * Les images qui ne tiennent pas le format de leur emplacement. C’est ce qui
 * rend vivant un `ratio` déclaré : le panel empêche le cas de se produire, et
 * ceci le rattrape sur un contenu écrit à la main ou plus ancien que le
 * recadrage.
 *
 * Un avertissement, jamais une erreur : la page s’affiche, et forcer sa
 * correction avant tout enregistrement bloquerait un site qui fonctionne.
 */
export function checkRatios(
  registry: BlockRegistry,
  pages: readonly RatioSource[],
  manifest: MediaManifest,
): readonly ContentIssue[] {
  const issues: ContentIssue[] = []

  const inspect = (
    fields: Parameters<typeof walkValues>[0],
    values: unknown,
    page: string,
    section?: ContentIssue['section'],
  ) => {
    walkValues(fields, values, (field, value) => {
      if (field.kind !== 'image' || field.ratio === undefined) return

      const key = typeof value === 'string' ? value.trim() : ''
      const entry = key === '' ? undefined : manifest[key]

      if (entry === undefined || matchesRatio(entry, field.ratio)) return

      issues.push({
        severity: 'warning',
        page,
        ...(section === undefined ? {} : { section }),
        field: field.label ?? 'image',
        message: `l’image « ${key} » est en ${entry.width}×${entry.height}, et cet emplacement attend des proportions ${field.ratio} : recadre-la depuis le panel`,
      })
    })
  }

  for (const page of pages) {
    inspect(META_FIELDS, page.meta, page.name)

    for (const [index, section] of page.blocks.entries()) {
      const definition = registry[section.type]

      if (definition === undefined) continue

      inspect(definition.fields, section.props, page.name, {
        index,
        id: section.id,
        label: definition.label,
      })
    }
  }

  return issues
}
