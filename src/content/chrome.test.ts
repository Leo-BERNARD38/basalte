// Le fichier de contenu du chrome : son absence, sa validation, et le fait
// qu’il ne soit pas une page.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { findBlocks, loadRegistry } from '../blocks/scan.js'
import { socleChrome } from '../chrome/scan.js'
import { resolveLanguages } from '../site/languages.js'
import { CHROME_FILE, readChromeFile, validateChrome } from './chrome.js'
import { errorsOf } from './project.js'
import { CONTENT_DIR, CONTENT_FORMAT } from './page.js'
import { readContent } from './read.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function site(chrome?: unknown): Promise<string> {
  await mkdir(TMP, { recursive: true })

  const root = await mkdtemp(path.join(TMP, 'chrome-content-'))

  roots.push(root)
  await mkdir(path.join(root, CONTENT_DIR), { recursive: true })
  await writeFile(
    path.join(root, CONTENT_DIR, 'index.json'),
    JSON.stringify({ $format: CONTENT_FORMAT, meta: {}, blocks: [] }),
    'utf8',
  )

  if (chrome !== undefined) {
    await writeFile(
      path.join(root, CONTENT_DIR, CHROME_FILE),
      JSON.stringify(chrome),
      'utf8',
    )
  }

  return root
}

const LANGUAGES = resolveLanguages({
  fr: { default: true },
  en: { draft: true },
})

async function registry() {
  return loadRegistry(
    await findBlocks([{ dir: socleChrome(), origin: 'socle' }]),
  )
}

async function check(source: unknown) {
  return validateChrome({
    source,
    registry: await registry(),
    languages: LANGUAGES,
    media: {},
    documents: {},
  })
}

describe('le chrome dans content/', () => {
  it('n’est pas une page : son nom ne fait aucune route', async () => {
    const root = await site({ $format: CONTENT_FORMAT })
    const files = await readContent(root)

    expect(files.map((file) => file.name)).toEqual(['index'])
  })

  // C’est le cas d’un site plus ancien que la phase : il doit se naviguer dès
  // sa montée de version, sans qu’aucune migration n’ait à écrire un fichier.
  it('absent, vaut l’enveloppe vide du format courant', async () => {
    const root = await site()

    expect(await readChromeFile(root)).toEqual({ $format: CONTENT_FORMAT })

    const result = await check(await readChromeFile(root))

    expect(errorsOf(result.issues)).toEqual([])
    expect(result.chrome.header['links']).toEqual([])
    expect(result.chrome.footer['links']).toEqual([])
  })

  it('refuse un JSON qui n’en est pas un', async () => {
    const root = await site()

    await writeFile(
      path.join(root, CONTENT_DIR, CHROME_FILE),
      '{ pas du json',
      'utf8',
    )

    await expect(readChromeFile(root)).rejects.toThrow(/n’est pas un JSON/)
  })

  it('nomme « basalte migrate » quand le format est en retard', async () => {
    const result = await check({ $format: CONTENT_FORMAT - 1 })

    expect(errorsOf(result.issues).map((issue) => issue.message)).toEqual([
      expect.stringContaining('basalte migrate'),
    ])
  })

  it('refuse un lien dont le libellé manque dans une langue en ligne', async () => {
    const result = await check({
      $format: CONTENT_FORMAT,
      header: { links: [{ label: {}, href: '/contact' }] },
    })

    expect(errorsOf(result.issues)).not.toEqual([])
  })

  it('accepte un chrome rempli, et rend ses valeurs', async () => {
    const result = await check({
      $format: CONTENT_FORMAT,
      header: {
        links: [{ label: { fr: 'Accueil', en: '' }, href: '/' }],
      },
      footer: {
        links: [
          { label: { fr: 'Mentions légales', en: '' }, href: '/mentions' },
        ],
      },
    })

    expect(errorsOf(result.issues)).toEqual([])
    expect(result.chrome.header['links']).toHaveLength(1)
    expect(result.chrome.footer['links']).toHaveLength(1)
  })

  // Une langue en préparation n’empêche aucune publication (D18) : elle se
  // compte, comme sur une page.
  it('compte les traductions d’une langue en préparation sans refuser', async () => {
    const result = await check({
      $format: CONTENT_FORMAT,
      header: { links: [{ label: { fr: 'Accueil', en: '' }, href: '/' }] },
    })

    expect(errorsOf(result.issues)).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toContainEqual(
      expect.stringContaining('en préparation'),
    )
  })

  it('refuse une enveloppe qui n’a pas la forme attendue', async () => {
    const result = await check({ $format: 'un', header: [] })

    expect(errorsOf(result.issues)).not.toEqual([])
  })
})
