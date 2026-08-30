// La lecture des pages d’un dépôt client. Un fichier de `content/` est une
// page, et son nom donne sa route : le client n’en crée pas (D3), le jeu est
// donc fixe.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { DOCUMENTS_FILE } from '../media/documents.js'
import { MANIFEST_FILE } from '../media/manifest.js'
import { CONTENT_DIR } from './page.js'

export type ContentFile = {
  /** Nom du fichier sans son extension, tel que les messages le citent. */
  readonly name: string
  readonly route: string
  readonly source: unknown
}

const NAME = /^[a-z0-9][a-z0-9-]*$/

// Les manifestes vivent dans `content/` parce qu’ils sont versionnés avec les
// pages et fusionnés comme elles, mais ce ne sont pas des pages : leur nom ne
// fait aucune route.
const MANIFESTS: ReadonlySet<string> = new Set([MANIFEST_FILE, DOCUMENTS_FILE])

export async function readContent(
  root: string,
): Promise<readonly ContentFile[]> {
  const directory = path.join(root, CONTENT_DIR)
  const files: ContentFile[] = []

  for (const name of await pageNames(root)) {
    files.push({
      name,
      route: routeOf(name),
      source: await parse(path.join(directory, `${name}.json`), `${name}.json`),
    })
  }

  return files
}

/**
 * Les routes du dépôt, sans ouvrir un seul fichier. Une route vient du nom de
 * la page, jamais de son contenu : qui n’a besoin que de savoir quelles
 * adresses existent n’a pas à lire ce qu’elles portent.
 */
export async function readRoutes(root: string): Promise<readonly string[]> {
  return (await pageNames(root)).map((name) => routeOf(name))
}

async function pageNames(root: string): Promise<readonly string[]> {
  const entries = await readdir(path.join(root, CONTENT_DIR), {
    withFileTypes: true,
  })
  const names: string[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue
    if (path.extname(entry.name) !== '.json') continue
    if (MANIFESTS.has(entry.name)) continue

    const name = path.basename(entry.name, '.json')

    if (!NAME.test(name)) {
      throw new Error(
        `« ${CONTENT_DIR}/${entry.name} » : un nom de page s’écrit en minuscules, chiffres et tirets.`,
      )
    }

    names.push(name)
  }

  return names
}

export function routeOf(name: string): string {
  return name === 'index' ? '/' : `/${name}`
}

async function parse(file: string, display: string): Promise<unknown> {
  const raw = await readFile(file, 'utf8')

  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new Error(
      `« ${CONTENT_DIR}/${display} » n’est pas un JSON valide : ${(cause as Error).message}`,
    )
  }
}
