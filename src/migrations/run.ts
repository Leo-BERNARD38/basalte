// L’application des migrations à un dépôt : lire le `$format` de chaque page,
// enchaîner celles qui manquent, écrire.
//
// Le calcul et l’écriture sont séparés, parce que `--dry-run` a besoin du
// premier sans le second. Une page écrite par un socle plus récent que celui
// installé n’est pas touchée : la migrer à l’envers perdrait ce qu’elle porte.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { BUSINESS_NAME, BUSINESS_PATH } from '../content/business.js'
import { CHROME_NAME, CHROME_PATH } from '../content/chrome.js'
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
  /** Nom du fichier, tel que les messages le citent. */
  readonly name: string
  /** Son chemin dans le dépôt, à barres — c’est celui qu’un commit reçoit. */
  readonly file: string
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

// Le chrome et la fiche d’entreprise sont migrés à côté des pages : ils portent
// le même `$format`, et un numéro que `migrate` n’atteindrait jamais serait
// plus trompeur que son absence.
export async function planMigrations(
  root: string,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = CONTENT_FORMAT,
): Promise<MigrationPlan> {
  const pages: PageMigration[] = []
  const ahead: string[] = []

  const files = [
    ...(await readContent(root)).map((file) => ({
      name: file.name,
      path: `${CONTENT_DIR}/${file.name}.json`,
      source: file.source,
      of: (migration: Migration) => migration.page,
    })),
    ...(await sideFile(
      root,
      CHROME_NAME,
      CHROME_PATH,
      (migration) => migration.chrome,
    )),
    ...(await sideFile(
      root,
      BUSINESS_NAME,
      BUSINESS_PATH,
      (migration) => migration.business,
    )),
  ]

  for (const file of files) {
    const from = formatOf(file.source, file.path)

    if (from > target) {
      ahead.push(file.name)
      continue
    }

    const pending = pendingFrom(from, target, migrations)

    if (pending.length === 0) continue

    pages.push({
      name: file.name,
      file: file.path,
      from,
      to: target,
      labels: pending.map((migration) => migration.label),
      value: apply(file.source as RawPage, pending, target, file.of),
    })
  }

  return { target, pages, ahead }
}

/**
 * Un fichier de `content/` qui porte du contenu sans être une page. Absent, il
 * ne fait rien : un site plus ancien que la fiche d’entreprise se migre sans
 * qu’une migration ait à créer un fichier.
 */
async function sideFile(
  root: string,
  name: string,
  file: string,
  transform: (
    migration: Migration,
  ) => ((value: RawPage) => RawPage) | undefined,
): Promise<
  readonly {
    readonly name: string
    readonly path: string
    readonly source: unknown
    readonly of: (migration: Migration) => (value: RawPage) => RawPage
  }[]
> {
  const raw = await readFile(path.join(root, file), 'utf8').catch(
    () => undefined,
  )

  if (raw === undefined) return []

  return [
    {
      name,
      path: file,
      source: JSON.parse(raw) as unknown,
      of: (migration: Migration) => transform(migration) ?? ((value) => value),
    },
  ]
}

/** Écrit les pages du plan, et rend leurs chemins relatifs à la racine. */
export async function writeMigrations(
  root: string,
  plan: MigrationPlan,
): Promise<readonly string[]> {
  const written: string[] = []

  for (const page of plan.pages) {
    await writeJsonFile(path.join(root, page.file), page.value)
    written.push(page.file)
  }

  return written
}

function apply(
  source: RawPage,
  pending: readonly Migration[],
  target: number,
  of: (migration: Migration) => (value: RawPage) => RawPage,
): RawPage {
  const migrated = pending.reduce(
    (page, migration) => of(migration)(page),
    source,
  )

  return { ...migrated, $format: target }
}

function formatOf(source: unknown, file: string): number {
  const format = (source as { readonly $format?: unknown } | null)?.$format

  if (typeof format !== 'number' || !Number.isInteger(format)) {
    throw new Error(
      `« ${file} » n’a pas de « $format » entier : impossible de savoir ce qu’il faut lui appliquer.`,
    )
  }

  return format
}
