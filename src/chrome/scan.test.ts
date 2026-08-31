// La découverte du chrome : celui du socle, puis celui du dépôt, avec la règle
// inverse de celle des blocs — un dossier du site remplace celui du socle.

import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { loadRegistry } from '../blocks/scan.js'
import { SLOTS } from './define.js'
import { chromeRoots, findChrome, socleChrome } from './scan.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

/** Un dépôt jetable portant un chrome à lui. */
async function repository(
  slot: string,
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = path.join(TMP, `chrome-${slot}-${Date.now()}`)
  const dir = path.join(root, 'src', 'chrome', slot)

  created.push(root)
  await mkdir(dir, { recursive: true })

  for (const [file, contents] of Object.entries(files)) {
    await writeFile(path.join(dir, file), contents, 'utf8')
  }

  return root
}

const HEADER =
  "export default { name: 'header', label: 'La barre du site', fields: {} }\n"

describe('findChrome', () => {
  it('rend les deux emplacements du socle quand le dépôt n’en porte aucun', async () => {
    const root = path.join(TMP, `chrome-vide-${Date.now()}`)

    created.push(root)
    await mkdir(root, { recursive: true })

    const found = await findChrome(root)

    expect(found.map((source) => source.name).toSorted()).toEqual(
      [...SLOTS].toSorted(),
    )
    expect(
      found.every((source) => source.component.startsWith(socleChrome())),
    ).toBe(true)
  })

  it('porte la variante bureau de chaque emplacement du socle', async () => {
    const root = path.join(TMP, `chrome-bureau-${Date.now()}`)

    created.push(root)
    await mkdir(root, { recursive: true })

    const found = await findChrome(root)

    expect(found.every((source) => source.desktop !== undefined)).toBe(true)
  })

  // C’est la règle inverse de celle des blocs, et le seul moyen pour un dépôt
  // client de redessiner son en-tête sans recopier une ligne du socle.
  it('laisse le dépôt remplacer un emplacement, sans échouer sur le doublon', async () => {
    const root = await repository('header', {
      'schema.ts': HEADER,
      'Header.astro': '<header>le mien</header>\n',
    })

    const found = await findChrome(root)
    const header = found.find((source) => source.name === 'header')
    const footer = found.find((source) => source.name === 'footer')

    expect(header?.origin).toBe('site')
    expect(header?.component).toContain(path.join('src', 'chrome', 'header'))
    expect(header?.desktop).toBeUndefined()
    expect(footer?.origin).toBe('socle')
  })

  it('refuse un dossier qui n’est pas un emplacement, en nommant les deux', async () => {
    const root = await repository('barre-laterale', {
      'schema.ts':
        "export default { name: 'barre-laterale', label: 'Barre', fields: {} }\n",
      'BarreLaterale.astro': '<aside />\n',
    })

    await expect(findChrome(root)).rejects.toThrow(/header et footer/)
  })

  it('parcourt le socle avant le dépôt', async () => {
    const roots = chromeRoots('/quelque/part')

    expect(roots.map((root) => root.origin)).toEqual(['socle', 'site'])
  })

  it('charge deux définitions que le panel sait décrire', async () => {
    const root = path.join(TMP, `chrome-registre-${Date.now()}`)

    created.push(root)
    await mkdir(root, { recursive: true })

    const registry = await loadRegistry(await findChrome(root))

    expect(Object.keys(registry).toSorted()).toEqual([...SLOTS].toSorted())
    expect(registry['header']?.label).toBe('En-tête')
    expect(registry['footer']?.fields['links']?.kind).toBe('list')
  })
})
