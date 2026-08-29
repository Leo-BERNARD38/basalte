import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

import { ingest, isDerivative, MAX_BYTES } from './ingest.js'
import { fileName } from './resolve.js'

async function photo(
  width: number,
  height: number,
  tint: number,
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: tint, g: 120, b: 200 },
    },
  })
    .jpeg()
    .toBuffer()
}

let large: Buffer
let small: Buffer

beforeAll(async () => {
  large = await photo(2000, 1000, 10)
  small = await photo(300, 200, 10)
})

describe('ingest', () => {
  it('nomme par l’empreinte du contenu, jamais par le nom reçu', async () => {
    const once = await ingest(large)
    const again = await ingest(large)
    const other = await ingest(await photo(2000, 1000, 240))

    expect(once.key).toBe(again.key)
    expect(once.key).not.toBe(other.key)
    expect(once.key).toMatch(/^[0-9a-f]{16}$/)
  })

  it('ne produit que du WebP, quel que soit le format reçu', async () => {
    const png = await sharp(large).png().toBuffer()
    const result = await ingest(png)

    expect(result.entry.format).toBe('webp')

    for (const file of result.files) {
      expect(file.name).toMatch(/\.webp$/)
      expect(file.data.subarray(8, 12).toString('ascii')).toBe('WEBP')
    }
  })

  it('produit les largeurs de l’échelle sous la taille reçue', async () => {
    const result = await ingest(large)

    expect(result.entry.widths).toEqual([480, 768, 1200, 1800, 2000])
    expect(result.files.map((file) => file.name)).toEqual(
      result.entry.widths.map((width) => fileName(result.key, width)),
    )
  })

  it('n’agrandit jamais une image', async () => {
    const result = await ingest(small)

    expect(result.entry.widths).toEqual([300])
    expect(result.entry.width).toBe(300)
    expect(result.entry.height).toBe(200)
  })

  it('applique l’orientation EXIF puis jette les métadonnées', async () => {
    const turned = await sharp(large)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const result = await ingest(turned)
    const stored = await sharp(result.files[0]!.data).metadata()

    expect(result.entry.width).toBe(1000)
    expect(result.entry.height).toBe(2000)
    expect(stored.exif).toBeUndefined()
    expect(stored.orientation).toBeUndefined()
  })

  it('refuse un SVG, même valide', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    )

    await expect(ingest(svg)).rejects.toThrow(/SVG est refusé/)
  })

  it('refuse un fichier qui n’est pas une image', async () => {
    await expect(ingest(Buffer.from('ceci est un texte'))).rejects.toThrow(
      /octets réels/,
    )
  })

  it('refuse au-delà de la limite de taille', async () => {
    await expect(ingest(Buffer.alloc(MAX_BYTES + 1))).rejects.toThrow(/limite/)
  })

  it('reconnaît un fichier qu’il a produit', () => {
    expect(isDerivative('a3f2c1d4b5e6f708-1200.webp')).toBe(true)
    expect(isDerivative('photo.jpg')).toBe(false)
    expect(isDerivative('a3f2c1d4b5e6f708.webp')).toBe(false)
  })
})
