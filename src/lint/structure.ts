// Deux règles qui ne portent sur aucun bloc en particulier : le fourre-tout,
// et le JavaScript qu’un bloc embarque.
//
// « Pas de `utils.ts`, pas de `helpers/` » n’est pas une question de goût
// (`docs/conventions.md`) : un fourre-tout est le seul endroit d’un dépôt où
// personne ne cherche avant d’écrire, donc celui où la duplication s’accumule.
// Un helper vit dans le dossier de son domaine.

import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { finding, relative, type Finding } from './finding.js'

const CATCH_ALL = new Set([
  'utils',
  'util',
  'helpers',
  'helper',
  'common',
  'commons',
  'misc',
  'shared',
  'divers',
])

const SOURCE_DIR = 'src'

export async function catchAll(root: string): Promise<readonly Finding[]> {
  const findings: Finding[] = []

  for (const entry of await walk(path.join(root, SOURCE_DIR))) {
    const base = path.basename(entry).replace(/\.[cm]?[jt]sx?$/, '')

    if (!CATCH_ALL.has(base.toLowerCase())) continue

    findings.push(
      finding({
        file: relative(root, entry),
        line: 1,
        rule: 'structure/catch-all',
        message: `« ${base} » est un fourre-tout — range chaque fonction dans le dossier de son domaine, là où on la cherchera.`,
        severity: 'error',
      }),
    )
  }

  return findings
}

/**
 * Le site public n’embarque aucun JavaScript par défaut, et un bloc qui en veut
 * le déclare (invariant 5). Rien ne peut décider à sa place si ce script est
 * mérité : la remarque avertit, elle ne refuse pas.
 */
export function inlineScripts(
  file: string,
  source: string,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const [index, text] of source.split(/\r?\n/).entries()) {
    if (!/<script[\s>]/i.test(text)) continue

    findings.push(
      finding({
        file,
        line: index + 1,
        rule: 'block/script',
        message:
          'ce bloc embarque du JavaScript — le site public n’en sert aucun par défaut : garde-le si l’interactivité le vaut, retire-le sinon.',
        severity: 'warning',
      }),
    )
  }

  return findings
}

async function walk(dir: string): Promise<readonly string[]> {
  const found: string[] = []

  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue

        if (CATCH_ALL.has(entry.name.toLowerCase())) {
          found.push(full)
          continue
        }

        found.push(...(await walk(full)))
        continue
      }

      found.push(full)
    }
  } catch {
    return []
  }

  return found
}
