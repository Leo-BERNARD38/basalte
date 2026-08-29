import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { MEDIA_DIR } from './ingest.js'
import { prepareMedia } from './prepare.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function site(files: Readonly<Record<string, string>>): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'media-'))

  roots.push(root)

  await mkdir(path.join(root, MEDIA_DIR), { recursive: true })

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(root, MEDIA_DIR, name), contents, 'utf8')
  }

  return root
}

describe('ingestion des images déposées à la main', () => {
  it('ne prend pas un fichier caché pour une image', async () => {
    const root = await site({ '.gitkeep': '', '.DS_Store': 'x' })

    expect(await prepareMedia(root)).toEqual([])
  })

  it('refuse un fichier qui n’est pas une image', async () => {
    const root = await site({ 'notes.txt': 'pas une image' })

    await expect(prepareMedia(root)).rejects.toThrow('image')
  })

  it('ne fait rien quand le dossier n’existe pas', async () => {
    await mkdir(WORK, { recursive: true })

    const root = await mkdtemp(path.join(WORK, 'media-'))

    roots.push(root)

    expect(await prepareMedia(root)).toEqual([])
  })
})
