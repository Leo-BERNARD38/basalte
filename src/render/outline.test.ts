// Le plan de titres : la première section porte le `h1`, et une page qui n’en
// a aucun se signale une fois construite.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { checkHeadings, headingOf } from './outline.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function built(pages: Readonly<Record<string, string>>): Promise<string> {
  await mkdir(TMP, { recursive: true })

  const root = await mkdtemp(path.join(TMP, 'outline-'))

  roots.push(root)

  for (const [route, body] of Object.entries(pages)) {
    const dir = path.join(root, route)

    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'index.html'),
      `<html><body>${body}</body></html>`,
      'utf8',
    )
  }

  return root
}

describe('headingOf', () => {
  it('donne le h1 à la première section, et h2 aux suivantes', () => {
    expect(headingOf(0)).toBe('h1')
    expect(headingOf(1)).toBe('h2')
    expect(headingOf(7)).toBe('h2')
  })
})

describe('checkHeadings', () => {
  it('ne dit rien d’une page qui porte un seul titre principal', async () => {
    const root = await built({ '': '<h1>Accueil</h1><h2>Suite</h2>' })

    expect(await checkHeadings(root)).toEqual([])
  })

  // Le titre d’une section est facultatif : une page qui ouvre sur une galerie
  // sans titre n’a pas de `h1`, et personne ne le verrait à l’œil.
  it('signale une page sans titre principal', async () => {
    const root = await built({ contact: '<h2>Nous écrire</h2>' })
    const issues = await checkHeadings(root)

    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.page).toBe('/contact')
  })

  it('signale une page qui en porte plusieurs', async () => {
    const root = await built({ '': '<h1>Un</h1><h1>Deux</h1>' })
    const issues = await checkHeadings(root)

    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('2 titres principaux')
  })

  // Les deux rendus sont sous la même racine : le bureau est vérifié comme le
  // mobile, sans que rien ne le nomme.
  it('parcourt aussi les pages du rendu bureau', async () => {
    const root = await built({
      '': '<h1>Accueil</h1>',
      _desktop: '<p>rien</p>',
    })

    expect((await checkHeadings(root)).map((issue) => issue.page)).toEqual([
      '/_desktop',
    ])
  })
})
