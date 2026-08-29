// L’application des migrations à un dépôt : lire le `$format` de chaque page,
// enchaîner celles qui manquent, écrire.
//
// Le calcul et l’écriture sont séparés, parce que `--dry-run` a besoin du
// premier sans le second. Une page écrite par un socle plus récent que celui
// installé n’est pas touchée : la migrer à l’envers perdrait ce qu’elle porte.

import path from 'node:path'

import { CONTENT_DIR, CONTENT_FORMAT } from '../content/page.js'
import { readContent } from '../content/read.js'
import { writeJsonFile } from '../content/write.js'
import {
  MIGRATIONS,
  pendingFrom,
  type Migration,
  type RawPage,
} from './index.js'

export type PageMigration = {
  /** Nom de la page, tel que les messages la citent. */
  readonly name: string
  readonly from: number
  readonly to: number
  readonly labels: readonly string[]
  readonly value: RawPage
}

export type MigrationPlan = {
  readonly target: number
  readonly pages: readonly PageMigration[]
  /** Les pages venues d’un socle plus récent : nommées, jamais transformées. */
  readonly ahead: readonly string[]
}

export async function planMigrations(
  root: string,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = CONTENT_FORMAT,
): Promise<MigrationPlan> {
  const pages: PageMigration[] = []
  const ahead: string[] = []

  for (const file of await readContent(root)) {
    const from = formatOf(file.source, file.name)

    if (from > target) {
      ahead.push(file.name)
      continue
    }

    const pending = pendingFrom(from, target, migrations)

    if (pending.length === 0) continue

    pages.push({
      name: file.name,
      from,
      to: target,
      labels: pending.map((migration) => migration.label),
      value: apply(file.source as RawPage, pending, target),
    })
  }

  return { target, pages, ahead }
}

/** Écrit les pages du plan, et rend leurs chemins relatifs à la racine. */
export async function writeMigrations(
  root: string,
  plan: MigrationPlan,
): Promise<readonly string[]> {
  const written: string[] = []

  for (const page of plan.pages) {
    const file = path.join(CONTENT_DIR, `${page.name}.json`)

    await writeJsonFile(path.join(root, file), page.value)
    written.push(file)
  }

  return written
}

function apply(
  source: RawPage,
  pending: readonly Migration[],
  target: number,
): RawPage {
  const migrated = pending.reduce(
    (page, migration) => migration.page(page),
    source,
  )

  return { ...migrated, $format: target }
}

function formatOf(source: unknown, name: string): number {
  const format = (source as { readonly $format?: unknown } | null)?.$format

  if (typeof format !== 'number' || !Number.isInteger(format)) {
    throw new Error(
      `« ${CONTENT_DIR}/${name}.json » n’a pas de « $format » entier : impossible de savoir ce qu’il faut lui appliquer.`,
    )
  }

  return format
}
