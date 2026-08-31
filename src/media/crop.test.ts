import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'

import { cropImage, originOf } from './crop.js'
import { ingest, MEDIA_DIR, storeMedia } from './ingest.js'
import type { MediaManifest } from './manifest.js'
import { matchesRatio, ratioOf } from './ratio.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

/** Un dépôt portant une seule image, ingérée comme le panel le ferait. */
async function siteWith(
  width: number,
  height: number,
): Promise<{ root: string; key: string; manifest: MediaManifest }> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'crop-'))

  roots.push(root)

  const source = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  })
    .jpeg()
    .toBuffer()

  const ingested = await ingest(source, { alt: { fr: 'Un aplat' } })

  await storeMedia(root, ingested)

  return {
    root,
    key: ingested.key,
    manifest: { [ingested.key]: ingested.entry },
  }
}

describe('cropImage', () => {
  it('rend une image au format demandé, sans toucher à l’originale', async () => {
    const { root, key, manifest } = await siteWith(1600, 1200)

    const cropped = await cropImage(root, manifest, key, {
      x: 0,
      y: 12.5,
      width: 100,
      height: 75,
    })

    expect(cropped.key).not.toBe(key)
    expect(matchesRatio(cropped.entry, '16/9')).toBe(true)
    expect(manifest[key]).toBeDefined()
    expect(manifest[key]?.width).toBe(1600)
  })

  it('note d’où elle vient et quel cadre a été retenu', async () => {
    const { root, key, manifest } = await siteWith(1600, 1200)
    const box = { x: 0, y: 12.5, width: 100, height: 75 }

    const cropped = await cropImage(root, manifest, key, box)

    expect(cropped.entry.source).toBe(key)
    expect(cropped.entry.crop).toEqual(box)
  })

  it('reprend le texte alternatif de l’originale', async () => {
    const { root, key, manifest } = await siteWith(1600, 1200)

    const cropped = await cropImage(root, manifest, key, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    })

    expect(cropped.entry.alt).toEqual({ fr: 'Un aplat' })
  })

  it('rend la même clé pour le même cadre, et une autre pour un autre', async () => {
    const { root, key, manifest } = await siteWith(1600, 1200)

    const once = await cropImage(root, manifest, key, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    })
    const again = await cropImage(root, manifest, key, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    })
    const elsewhere = await cropImage(root, manifest, key, {
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    })

    expect(once.key).toBe(again.key)
    expect(once.key).not.toBe(elsewhere.key)
  })

  it('repart de l’originale quand on recadre un recadrage', async () => {
    const { root, key, manifest } = await siteWith(2000, 1000)

    const wide = await cropImage(root, manifest, key, {
      x: 0,
      y: 0,
      width: 40,
      height: 100,
    })

    await storeMedia(root, wide)

    const chained: MediaManifest = { ...manifest, [wide.key]: wide.entry }

    expect(originOf(chained, wide.key)).toBe(key)

    const again = await cropImage(root, chained, wide.key, {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    })

    // Le cadre porte sur l’originale : la sortie fait 2000×500, pas 800×500.
    expect(again.entry.source).toBe(key)
    expect(ratioOf(again.entry)).toBeCloseTo(4, 1)
  })

  it('refuse une clé qui n’est pas dans la médiathèque', async () => {
    const { root, manifest } = await siteWith(1600, 1200)

    await expect(
      cropImage(root, manifest, '0000000000000000', {
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      }),
    ).rejects.toThrow(/médiathèque/)
  })

  it('écrit ses largeurs dans le dépôt comme un téléversement', async () => {
    const { root, key, manifest } = await siteWith(1600, 1200)

    const cropped = await cropImage(root, manifest, key, {
      x: 0,
      y: 12.5,
      width: 100,
      height: 75,
    })

    await storeMedia(root, cropped)

    for (const file of cropped.files) {
      const written = await sharp(
        path.join(root, MEDIA_DIR, file.name),
      ).metadata()

      expect(written.format).toBe('webp')
    }
  })
})
