// Le poids d’une page : ce qu’un navigateur télécharge en l’ouvrant, et le
// seuil au-delà duquel on le dit.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { checkWeight, downloaded, PAGE_BUDGET } from './weight.js'

const TMP = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const roots: string[] = []

const KEY = '0123456789abcdef'

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function built(
  html: string,
  assets: Readonly<Record<string, number>>,
): Promise<string> {
  await mkdir(TMP, { recursive: true })

  const root = await mkdtemp(path.join(TMP, 'weight-'))

  roots.push(root)

  await writeFile(path.join(root, 'index.html'), html, 'utf8')

  for (const [name, size] of Object.entries(assets)) {
    await mkdir(path.join(root, path.dirname(name)), { recursive: true })
    await writeFile(path.join(root, name), Buffer.alloc(size))
  }

  return root
}

function picture(widths: readonly number[]): string {
  return `<img src="/media/${KEY}-${widths.at(-1)}.webp" srcset="${widths
    .map((width) => `/media/${KEY}-${width}.webp ${width}w`)
    .join(', ')}" alt="Un atelier">`
}

describe('downloaded', () => {
  it('ne retient qu’une dérivée par image, la plus large', () => {
    expect(downloaded(picture([320, 640, 1280]))).toEqual([
      `media/${KEY}-1280.webp`,
    ])
  })

  it('retient les feuilles de style, jamais les documents', () => {
    expect(
      downloaded(
        '<link rel="stylesheet" href="/_astro/index.abc123.css"><a href="/documents/0123456789abcdef.pdf">Plaquette</a>',
      ),
    ).toEqual(['_astro/index.abc123.css'])
  })
})

describe('checkWeight', () => {
  it('dit le poids d’une page qui dépasse ce qu’on s’accorde', async () => {
    const root = await built(picture([320, 1280]), {
      [`media/${KEY}-320.webp`]: 1024,
      [`media/${KEY}-1280.webp`]: PAGE_BUDGET + 1,
    })

    const issues = await checkWeight(root)

    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.page).toBe('/')
    expect(issues[0]?.message).toContain('Mo')
  })

  it('ne dit rien d’une page qui tient dans le budget', async () => {
    const root = await built(picture([320, 1280]), {
      [`media/${KEY}-1280.webp`]: 1024,
    })

    expect(await checkWeight(root)).toEqual([])
  })

  it('laisse une page de redirection en dehors', async () => {
    const root = await built(
      `<meta http-equiv="refresh" content="0;url=/">${picture([1280])}`,
      { [`media/${KEY}-1280.webp`]: PAGE_BUDGET + 1 },
    )

    expect(await checkWeight(root)).toEqual([])
  })
})
