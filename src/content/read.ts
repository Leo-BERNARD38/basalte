// La lecture des pages d’un dépôt client. Un fichier de `content/` est une
// page, et son nom donne sa route : le client n’en crée pas (D3), le jeu est
// donc fixe.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { MANIFEST_FILE } from '../media/manifest.js'
import { CONTENT_DIR } from './page.js'

export type ContentFile = {
  /** Nom du fichier sans son extension, tel que les messages le citent. */
  readonly name: string
  readonly route: string
  readonly source: unknown
}

const NAME = /^[a-z0-9][a-z0-9-]*$/

export async function readContent(
  root: string,
): Promise<readonly ContentFile[]> {
  const directory = path.join(root, CONTENT_DIR)
  const entries = await readdir(directory, { withFileTypes: true })
  const files: ContentFile[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue
    if (path.extname(entry.name) !== '.json') continue
    if (entry.name === MANIFEST_FILE) continue

    const name = path.basename(entry.name, '.json')

    if (!NAME.test(name)) {
      throw new Error(
        `« ${CONTENT_DIR}/${entry.name} » : un nom de page s’écrit en minuscules, chiffres et tirets.`,
      )
    }

    files.push({
      name,
      route: routeOf(name),
      source: await parse(path.join(directory, entry.name), entry.name),
    })
  }

  return files
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
