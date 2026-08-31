// Le parcours des blocs : ceux du socle, puis ceux du dépôt client. Un dossier
// porte un `schema.ts` et le composant du même nom en PascalCase — rien à
// déclarer ailleurs (invariant 7).
//
// Ce composant est le rendu mobile, celui qui existe toujours. Un troisième
// fichier, facultatif, porte la variante bureau : `<Nom>.desktop.astro`. Elle se
// découvre au même endroit et de la même façon, et son absence est un repli sur
// le composant, jamais une erreur.

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { DESKTOP_SUFFIX } from '../render/supports.js'
import type { BlockDefinition, BlockRegistry } from './define.js'

export type BlockOrigin = 'socle' | 'site'

export type BlockSource = {
  readonly name: string
  readonly origin: BlockOrigin
  readonly schema: string
  readonly component: string
  /** La variante bureau, quand le bloc en porte une. */
  readonly desktop?: string
}

export type BlockRoot = {
  readonly dir: string
  readonly origin: BlockOrigin
}

const NAME = /^[a-z][a-z0-9-]*$/

// L’emplacement des blocs du socle, résolu depuis ce fichier compilé : la même
// valeur dans ce dépôt et une fois installé sous `node_modules`.
export function socleBlocks(): string {
  return fileURLToPath(new URL('./', import.meta.url))
}

// Les deux racines, dans l’ordre où elles sont parcourues : le socle d’abord,
// le dépôt ensuite.
export function blockRoots(root: string): readonly BlockRoot[] {
  return [
    { dir: socleBlocks(), origin: 'socle' },
    { dir: path.join(root, 'src', 'blocks'), origin: 'site' },
  ]
}

export function componentName(block: string): string {
  return block
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Ce qu’un même nom rencontré deux fois veut dire. Pour un bloc, c’est une
 * erreur : le contenu désigne son type par ce nom, et rien ne dirait lequel
 * des deux il a obtenu. Pour le chrome, c’est un remplacement — la racine la
 * plus tardive prend la place de la précédente, seul moyen pour un dépôt
 * client d’en changer l’allure sans recopier une ligne du socle (invariant 8).
 */
export type Duplicates = 'refuse' | 'replace'

export async function findBlocks(
  roots: readonly BlockRoot[],
  duplicates: Duplicates = 'refuse',
): Promise<readonly BlockSource[]> {
  const found = new Map<string, BlockSource>()

  for (const root of roots) {
    for (const name of await directories(root.dir)) {
      if (!NAME.test(name)) continue

      const previous = found.get(name)

      if (previous !== undefined && duplicates === 'refuse') {
        throw new Error(
          `Deux blocs portent le nom « ${name} » : ${previous.schema} et ${path.join(root.dir, name)}. Renomme celui du site.`,
        )
      }

      found.set(name, await source(root, name))
    }
  }

  return [...found.values()]
}

export async function loadRegistry(
  sources: readonly BlockSource[],
): Promise<BlockRegistry> {
  const registry: Record<string, BlockDefinition> = {}

  for (const source of sources) {
    const loaded: unknown = await import(pathToFileURL(source.schema).href)
    const definition = (loaded as { default?: unknown }).default

    if (!isDefinition(definition)) {
      throw new Error(
        `« ${source.schema} » doit exporter par défaut le résultat de block().`,
      )
    }

    if (definition.name !== source.name) {
      throw new Error(
        `Le bloc « ${definition.name} » vit dans un dossier « ${source.name} » : les deux noms doivent coïncider.`,
      )
    }

    registry[definition.name] = definition
  }

  return registry
}

async function source(root: BlockRoot, name: string): Promise<BlockSource> {
  const dir = path.join(root.dir, name)
  const component = path.join(dir, `${componentName(name)}.astro`)
  const desktop = path.join(dir, `${componentName(name)}${DESKTOP_SUFFIX}`)
  const schema = await first(dir, ['schema.ts', 'schema.js'])

  if (schema === undefined) {
    throw new Error(`Le bloc « ${name} » n’a pas de « schema.ts ».`)
  }

  if (!(await exists(component))) {
    throw new Error(
      `Le bloc « ${name} » n’a pas de composant « ${componentName(name)}.astro ».`,
    )
  }

  return {
    name,
    origin: root.origin,
    schema,
    component,
    ...((await exists(desktop)) ? { desktop } : {}),
  }
}

async function directories(dir: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

async function first(
  dir: string,
  names: readonly string[],
): Promise<string | undefined> {
  for (const name of names) {
    const file = path.join(dir, name)

    if (await exists(file)) return file
  }

  return undefined
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

function isDefinition(value: unknown): value is BlockDefinition {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<BlockDefinition>

  return (
    typeof candidate.name === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.fields === 'object'
  )
}
