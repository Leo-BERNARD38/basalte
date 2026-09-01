// La découverte des blocs, et celle de leur variante bureau. Rien n’est
// déclaré : c’est le dossier qui dit ce que le bloc porte (invariant 7).

import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { blockRoots, findBlocks, socleBlocks } from './scan.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

/** Un dépôt jetable portant un bloc, avec ou sans sa variante bureau. */
async function repository(
  name: string,
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = path.join(TMP, `scan-${name}-${Date.now()}`)
  const dir = path.join(root, 'src', 'blocks', name)

  created.push(root)
  await mkdir(dir, { recursive: true })

  for (const [file, contents] of Object.entries(files)) {
    await writeFile(path.join(dir, file), contents, 'utf8')
  }

  return root
}

const SCHEMA = "export default { name: 'essai', label: 'Essai', fields: {} }\n"

describe('findBlocks', () => {
  it('ne porte aucune variante quand le dossier n’en a pas', async () => {
    const root = await repository('essai', {
      'schema.ts': SCHEMA,
      'Essai.astro': '<p>mobile</p>\n',
    })

    const found = await findBlocks([
      { dir: path.join(root, 'src', 'blocks'), origin: 'site' },
    ])

    expect(found).toHaveLength(1)
    expect(found[0]?.desktop).toBeUndefined()
  })

  it('trouve « <Nom>.desktop.astro » à côté du composant', async () => {
    const root = await repository('essai', {
      'schema.ts': SCHEMA,
      'Essai.astro': '<p>mobile</p>\n',
      'Essai.desktop.astro': '<p>bureau</p>\n',
    })

    const found = await findBlocks([
      { dir: path.join(root, 'src', 'blocks'), origin: 'site' },
    ])

    expect(found[0]?.desktop).toBe(
      path.join(root, 'src', 'blocks', 'essai', 'Essai.desktop.astro'),
    )
  })

  it('ne donne une variante qu’aux blocs du socle qui en portent une', async () => {
    const found = await findBlocks(blockRoots(socleBlocks()))
    const withVariant = found
      .filter((source) => source.desktop !== undefined)
      .map((source) => source.name)

    expect(withVariant).toEqual(['comparison', 'faq', 'hero', 'showcase'])
  })
})
