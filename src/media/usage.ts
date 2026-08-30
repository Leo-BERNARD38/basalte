// Les médias référencés par le contenu. Deux besoins s’en servent : le panel
// refuse de supprimer une image ou un document encore employé, et
// `basalte check` signale ceux que plus rien n’emploie.

import type { BlockRegistry } from '../blocks/define.js'
import { META_FIELDS, type PageBlock } from '../content/page.js'
import { walkValues } from '../fields/walk.js'

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
