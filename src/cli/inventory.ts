// `basalte inventory` : tout ce qui est réutilisable, généré depuis le code.
// C’est ce qui rend tenable la règle « chercher avant d’écrire » de
// docs/conventions.md — un inventaire écrit à la main est faux en deux
// semaines.
//
// Sous `--agent`, la même sortie est écrite dans `.claude/basalte.md` du dépôt
// plutôt qu’affichée : c’est le `postinstall` d’un dépôt client qui l’appelle,
// et c’est ce qui tient la doc agent à jour sans jamais la recopier (D27).

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { blockRoots, findBlocks, loadRegistry } from '../blocks/scan.js'
import { AGENT_DOC, basalteDoc } from '../client/agent.js'
import { readSocle } from '../client/socle.js'
import { FIELD_TYPES } from '../fields/define.js'
import { describeFields, type FieldDescription } from '../fields/describe.js'
import { hasFlag, line, succeeds } from './args.js'
import type { Result } from './run.js'

export type Entry = {
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
  const blocks = await readEntries(cwd)

  if (hasFlag(argv, '--json')) {
    return {
      code: 0,
      stdout: `${JSON.stringify({ fieldTypes: FIELD_TYPES, blocks }, null, 2)}\n`,
      stderr: '',
    }
  }

  if (hasFlag(argv, '--agent')) {
    const file = await writeAgentDoc(cwd, blocks)

    return succeeds([line('ok', `« ${file} » régénéré`)])
  }

  return succeeds(render(blocks))
}

/** Les blocs disponibles depuis un dépôt : ceux du socle, puis les siens. */
export async function readEntries(cwd: string): Promise<readonly Entry[]> {
  const sources = await findBlocks(blockRoots(cwd))
  const registry = await loadRegistry(sources)

  return sources.map((source) => {
    const definition = registry[source.name]

    return {
      name: source.name,
      origin: source.origin,
      label: definition?.label ?? source.name,
      ...(definition?.help === undefined ? {} : { help: definition.help }),
      fields: describeFields(definition?.fields ?? {}),
    }
  })
}

/** Écrit `.claude/basalte.md`, et rend son chemin relatif à la racine. */
export async function writeAgentDoc(
  cwd: string,
  blocks: readonly Entry[],
): Promise<string> {
  const file = path.join(cwd, AGENT_DOC)

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, basalteDoc(render(blocks), readSocle().version), 'utf8')

  return AGENT_DOC
}

export function render(blocks: readonly Entry[]): readonly string[] {
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
  if (field.headings === true) parts.push('titres ## et ###')
  if (field.lists === true) parts.push('listes')
  if (field.external === true) parts.push('externe')

  if (field.options !== undefined) {
    parts.push(field.options.map((option) => option.value).join(' | '))
  }

  return parts.join(', ')
}
