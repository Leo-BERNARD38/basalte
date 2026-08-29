import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readContent, routeOf } from './read.js'

async function project(
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'basalte-'))

  await mkdir(path.join(root, 'content'))

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(root, 'content', name), content, 'utf8')
  }

  return root
}

describe('readContent', () => {
  it('lit les pages et laisse le manifeste des médias de côté', async () => {
    const root = await project({
      'index.json': '{"$format":1}',
      'contact.json': '{"$format":1}',
      'media.json': '{}',
      'notes.txt': 'ignoré',
    })

    const files = await readContent(root)

    expect(files.map((file) => file.name)).toEqual(['contact', 'index'])
  })

  it('donne la racine à index et son nom aux autres', () => {
    expect(routeOf('index')).toBe('/')
    expect(routeOf('contact')).toBe('/contact')
  })

  it('nomme le fichier dont le JSON est cassé', async () => {
    const root = await project({ 'index.json': '{ oups' })

    await expect(readContent(root)).rejects.toThrow(/content\/index\.json/)
  })

  it('refuse un nom de page qui ne fera pas une route', async () => {
    const root = await project({ 'Ma Page.json': '{}' })

    await expect(readContent(root)).rejects.toThrow(/nom de page/)
  })
})
