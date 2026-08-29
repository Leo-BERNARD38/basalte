import { readdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import { MAX_BYTES, MEDIA_DIR } from '../media/ingest.js'
import { handlePanel } from './panel.js'
import { bench, defaultPage, IMAGE, ORIGIN } from './panel.fixture.js'

let png: Buffer

beforeAll(async () => {
  png = await sharp({
    create: {
      width: 640,
      height: 400,
      channels: 3,
      background: { r: 30, g: 80, b: 150 },
    },
  })
    .png()
    .toBuffer()
})

function upload(
  data: Buffer,
  alt: Record<string, string>,
  name = 'essai.png',
): FormData {
  const form = new FormData()

  form.set('file', new File([new Uint8Array(data)], name))
  form.set('alt', JSON.stringify(alt))

  return form
}

describe('POST /api/media', () => {
  it('ré-encode, produit les largeurs, et range sous l’empreinte', async () => {
    const site = await bench()

    const body = await (
      await site.call('POST', '/api/media', upload(png, { fr: 'Un aplat' }))
    ).json()

    expect(body.ok).toBe(true)
    expect(body.media.format).toBe('webp')
    expect(body.media.key).toMatch(/^[0-9a-f]{16}$/)
    expect(body.media.widths).toEqual([480, 640])
    expect(body.media.usage).toBe(0)

    const files = await readdir(path.join(site.root, MEDIA_DIR))

    expect(files.sort()).toEqual([
      `${body.media.key}-480.webp`,
      `${body.media.key}-640.webp`,
    ])

    expect((await site.media())[body.media.key]?.alt).toEqual({
      fr: 'Un aplat',
    })

    await site.close()
  })

  it('refuse un corps trop lourd avant même de le lire', async () => {
    const site = await bench()

    const response = await handlePanel(
      site.panel,
      new Request(`${ORIGIN}/api/media`, {
        method: 'POST',
        headers: {
          cookie: site.cookie,
          origin: ORIGIN,
          'content-type': 'multipart/form-data; boundary=limite',
          'content-length': String(MAX_BYTES * 4),
        },
        body: '--limite--',
      }),
    )

    expect(response?.status).toBe(413)
    expect(
      await readdir(path.join(site.root, MEDIA_DIR)).catch(() => []),
    ).toEqual([])

    await site.close()
  })

  it('exige le texte alternatif dans chaque langue en ligne', async () => {
    const site = await bench()

    const response = await site.call('POST', '/api/media', upload(png, {}))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.message).toContain('texte alternatif')
    expect(
      await readdir(path.join(site.root, MEDIA_DIR)).catch(() => []),
    ).toEqual([])

    await site.close()
  })

  it('n’exige rien d’une langue en préparation', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/media',
      upload(png, { fr: 'Un aplat' }),
    )

    expect(response.status).toBe(200)

    await site.close()
  })

  it('refuse un fichier qui n’est pas une image', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/media',
      upload(Buffer.from('bonjour'), { fr: 'x' }, 'faux.png'),
    )

    expect(response.status).toBe(422)
    expect((await response.json()).message).toContain('octets réels')

    await site.close()
  })

  it('refuse le SVG, quel que soit son nom', async () => {
    const site = await bench()

    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    )

    const response = await site.call(
      'POST',
      '/api/media',
      upload(svg, { fr: 'x' }, 'logo.png'),
    )

    expect(response.status).toBe(422)
    expect((await response.json()).message).toContain('SVG')

    await site.close()
  })

  it('refuse un téléversement venu d’ailleurs', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/media',
      upload(png, { fr: 'x' }),
      { origin: 'https://ailleurs.test' },
    )

    expect(response.status).toBe(403)

    await site.close()
  })
})

describe('PATCH /api/media/:clé', () => {
  it('enregistre le texte alternatif et le point focal', async () => {
    const site = await bench()

    const response = await site.call('PATCH', `/api/media/${IMAGE}`, {
      alt: { fr: 'Une autre description', en: 'Another one' },
      focal: { x: 30, y: 70 },
    })

    expect(response.status).toBe(200)

    const entry = (await site.media())[IMAGE]

    expect(entry?.alt).toEqual({
      fr: 'Une autre description',
      en: 'Another one',
    })
    expect(entry?.focal).toEqual({ x: 30, y: 70 })

    await site.close()
  })

  it('refuse de vider le texte alternatif d’une langue en ligne', async () => {
    const site = await bench()

    const response = await site.call('PATCH', `/api/media/${IMAGE}`, {
      alt: { fr: '  ' },
    })

    expect(response.status).toBe(422)
    expect((await site.media())[IMAGE]?.alt['fr']).toBe('Une image d’essai')

    await site.close()
  })

  it('refuse un point focal hors de l’image', async () => {
    const site = await bench()

    const response = await site.call('PATCH', `/api/media/${IMAGE}`, {
      focal: { x: 140, y: 0 },
    })

    expect(response.status).toBe(400)

    await site.close()
  })

  it('ne connaît pas une clé inventée', async () => {
    const site = await bench()

    expect(
      (await site.call('PATCH', '/api/media/ffffffffffffffff', { alt: {} }))
        .status,
    ).toBe(404)

    expect(
      (await site.call('PATCH', '/api/media/../secret', { alt: {} })).status,
    ).toBe(404)

    await site.close()
  })
})

describe('DELETE /api/media/:clé', () => {
  it('refuse de supprimer une image employée par une section', async () => {
    const page = defaultPage() as any

    page.blocks[0].props.image = IMAGE

    const site = await bench({ content: page })
    const response = await site.call('DELETE', `/api/media/${IMAGE}`)

    expect(response.status).toBe(409)
    expect((await response.json()).message).toContain('1 section')
    expect((await site.media())[IMAGE]).toBeDefined()

    await site.close()
  })

  it('supprime une image que rien n’emploie, fichiers compris', async () => {
    const site = await bench()

    const added = await (
      await site.call('POST', '/api/media', upload(png, { fr: 'Un aplat' }))
    ).json()

    const response = await site.call('DELETE', `/api/media/${added.media.key}`)

    expect(response.status).toBe(200)
    expect((await site.media())[added.media.key]).toBeUndefined()
    expect(await readdir(path.join(site.root, MEDIA_DIR))).toEqual([])

    await site.close()
  })
})

describe('médias et contenu', () => {
  it('refuse d’enregistrer une page qui référence une image absente', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks[0].props.image = 'ffffffffffffffff'

    const body = await (
      await site.call('PUT', '/api/pages/index', draft)
    ).json()

    expect(body.problems.join(' ')).toContain('n’est pas dans la médiathèque')

    await site.close()
  })

  it('compte les emplois d’une image dans la charge utile', async () => {
    const page = defaultPage() as any

    page.blocks[0].props.image = IMAGE

    const site = await bench({ content: page })
    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.media[0].usage).toBe(1)
    expect(payload.pages[0].blocks[0].props.image).toBe(IMAGE)
    expect((page as { $format: number }).$format).toBe(CONTENT_FORMAT)

    await site.close()
  })
})
