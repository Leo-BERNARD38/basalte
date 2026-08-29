// `basalte inventory` : tout ce qui est réutilisable, généré depuis le code.
// C’est ce qui rend tenable la règle « chercher avant d’écrire » de
// docs/conventions.md — un inventaire écrit à la main est faux en deux
// semaines.

import { blockRoots, findBlocks, loadRegistry } from '../blocks/scan.js'
import { FIELD_TYPES } from '../fields/define.js'
import { describeFields, type FieldDescription } from '../fields/describe.js'
import type { Result } from './run.js'

type Entry = {
  readonly name: string
  readonly origin: string
  readonly label: string
  readonly help?: string
  readonly fields: readonly FieldDescription[]
}

export async function inventory(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const sources = await findBlocks(blockRoots(cwd))

  const registry = await loadRegistry(sources)

  const blocks: Entry[] = sources.map((source) => {
    const definition = registry[source.name]

    return {
      name: source.name,
      origin: source.origin,
      label: definition?.label ?? source.name,
      ...(definition?.help === undefined ? {} : { help: definition.help }),
      fields: describeFields(definition?.fields ?? {}),
    }
  })

  if (argv.includes('--json')) {
    return {
      code: 0,
      stdout: `${JSON.stringify({ fieldTypes: FIELD_TYPES, blocks }, null, 2)}\n`,
      stderr: '',
    }
  }

  return { code: 0, stdout: `${render(blocks).join('\n')}\n`, stderr: '' }
}

function render(blocks: readonly Entry[]): readonly string[] {
  const lines = ['basalte inventory', '', 'Types de champs']

  const width = Math.max(...FIELD_TYPES.map((type) => type.kind.length))

  for (const type of FIELD_TYPES) {
    lines.push(`  ${type.kind.padEnd(width)}  ${type.summary}`)

    for (const option of type.options) {
      lines.push(`  ${''.padEnd(width)}    ${option}`)
    }
  }

  for (const origin of ['socle', 'site'] as const) {
    const group = blocks.filter((entry) => entry.origin === origin)

    if (group.length === 0) continue

    lines.push('', origin === 'socle' ? 'Blocs du socle' : 'Blocs de ce site')

    for (const entry of group) {
      lines.push('', `  ${entry.name} — ${entry.label}`)

      if (entry.help !== undefined) lines.push(`    ${entry.help}`)

      lines.push(...fields(entry.fields, 2))
    }
  }

  return lines
}

function fields(
  descriptions: readonly FieldDescription[],
  depth: number,
): readonly string[] {
  const indent = '  '.repeat(depth)
  const width = Math.max(...descriptions.map((field) => field.name.length), 0)
  const lines: string[] = []

  for (const field of descriptions) {
    const detail = constraints(field)

    lines.push(
      `${indent}  ${field.name.padEnd(width)}  ${field.kind.padEnd(8)} ${field.label}${detail === '' ? '' : ` — ${detail}`}`,
    )

    if (field.fields !== undefined) {
      lines.push(...fields(field.fields, depth + 2))
    }
  }

  return lines
}

function constraints(field: FieldDescription): string {
  const parts: string[] = []

  if (field.i18n) parts.push('traduisible')
  if (field.required) parts.push('requis')
  if (field.min !== undefined) parts.push(`min ${field.min}`)
  if (field.max !== undefined) parts.push(`max ${field.max}`)
  if (field.ratio !== undefined) parts.push(`ratio ${field.ratio}`)
  if (field.external === true) parts.push('externe')

  if (field.options !== undefined) {
    parts.push(field.options.map((option) => option.value).join(' | '))
  }

  return parts.join(', ')
}
