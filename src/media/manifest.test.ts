import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { CONTENT_DIR } from '../content/page.js'
import { MANIFEST_PATH, readManifest, writeManifest } from './manifest.js'

const roots: string[] = []

const ENTRY = {
  format: 'webp',
  width: 1200,
  height: 800,
  widths: [480, 1200],
  alt: { fr: 'Un aplat' },
}

async function depot(manifest?: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'basalte-manifeste-'))

  roots.push(root)

  await mkdir(path.join(root, CONTENT_DIR), { recursive: true })

  if (manifest !== undefined) {
    await writeFile(path.join(root, MANIFEST_PATH), manifest, 'utf8')
  }

  return root
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

describe('readManifest', () => {
  it('rend une médiathèque vide quand le fichier n’existe pas', async () => {
    expect(await readManifest(await depot())).toEqual({})
  })

  it('lit une entrée complète', async () => {
    const root = await depot(
      JSON.stringify({
        '0123456789abcdef': { ...ENTRY, focal: { x: 30, y: 70 } },
      }),
    )

    expect(await readManifest(root)).toEqual({
      '0123456789abcdef': { ...ENTRY, focal: { x: 30, y: 70 } },
    })
  })

  it('refuse un JSON qui n’en est pas un', async () => {
    await expect(readManifest(await depot('{ pas du json'))).rejects.toThrow(
      /n’est pas un JSON valide/,
    )
  })

  // Le manifeste est un fichier du dépôt : éditable à la main, fusionné par
  // git. Une entrée cassée doit être refusée ici plutôt que faire planter le
  // rendu, et le point focal part dans un attribut `style`.
  it('refuse une entrée qui ne décrit pas une image', async () => {
    for (const broken of [
      { '0123456789abcdef': { ...ENTRY, widths: [] } },
      { '0123456789abcdef': { ...ENTRY, widths: undefined } },
      { '0123456789abcdef': { ...ENTRY, width: -1 } },
      { '0123456789abcdef': { ...ENTRY, focal: { x: 30 } } },
      {
        '0123456789abcdef': {
          ...ENTRY,
          focal: { x: '0;background:red', y: 0 },
        },
      },
      { '0123456789abcdef': { ...ENTRY, focal: { x: 300, y: 0 } } },
      { 'pas-une-clef': ENTRY },
    ]) {
      await expect(
        readManifest(await depot(JSON.stringify(broken))),
      ).rejects.toThrow(/ne décrit pas une médiathèque/)
    }
  })
})

describe('writeManifest', () => {
  it('range les clés et termine par une ligne vide', async () => {
    const root = await depot()

    await writeManifest(root, {
      ffffffffffffffff: ENTRY,
      '0123456789abcdef': ENTRY,
    })

    const raw = await readFile(path.join(root, MANIFEST_PATH), 'utf8')

    expect(Object.keys(JSON.parse(raw) as object)).toEqual([
      '0123456789abcdef',
      'ffffffffffffffff',
    ])
    expect(raw.endsWith('\n')).toBe(true)
  })

  // Le remplacement passe par un fichier voisin puis un renommage : rien ne
  // doit rester derrière lui.
  it('ne laisse aucun fichier de travail', async () => {
    const root = await depot()

    await writeManifest(root, { '0123456789abcdef': ENTRY })

    await expect(
      readFile(`${path.join(root, MANIFEST_PATH)}.partial`, 'utf8'),
    ).rejects.toThrow()
    expect(await readManifest(root)).toEqual({ '0123456789abcdef': ENTRY })
  })
})
