import { describe, expect, it } from 'vitest'

import type { MediaManifest } from './manifest.js'
import { resolveImage } from './resolve.js'

const manifest: MediaManifest = {
  a3f2c1d4b5e6f708: {
    format: 'webp',
    width: 2000,
    height: 1000,
    widths: [480, 1200, 2000],
    alt: { fr: 'Un atelier au petit matin', en: '' },
    focal: { x: 30, y: 20 },
  },
}

describe('resolveImage', () => {
  it('rend un srcset couvrant toutes les largeurs produites', () => {
    const image = resolveImage(manifest, 'a3f2c1d4b5e6f708', 'fr')

    expect(image?.src).toBe('/media/a3f2c1d4b5e6f708-2000.webp')
    expect(image?.srcset).toBe(
      '/media/a3f2c1d4b5e6f708-480.webp 480w, /media/a3f2c1d4b5e6f708-1200.webp 1200w, /media/a3f2c1d4b5e6f708-2000.webp 2000w',
    )
    expect(image?.width).toBe(2000)
    expect(image?.height).toBe(1000)
  })

  it('rend le texte alternatif de la langue demandée', () => {
    expect(resolveImage(manifest, 'a3f2c1d4b5e6f708', 'fr')?.alt).toBe(
      'Un atelier au petit matin',
    )
    expect(resolveImage(manifest, 'a3f2c1d4b5e6f708', 'en')?.alt).toBe('')
  })

  it('rend le point focal en object-position, centré par défaut', () => {
    expect(
      resolveImage(manifest, 'a3f2c1d4b5e6f708', 'fr')?.objectPosition,
    ).toBe('30% 20%')

    const { focal: _focal, ...sansFocal } = manifest['a3f2c1d4b5e6f708']!
    const centered = resolveImage({ x: sansFocal }, 'x', 'fr')

    expect(centered?.objectPosition).toBe('50% 50%')
  })

  it('ne rend rien pour une clé absente du manifeste', () => {
    expect(resolveImage(manifest, 'inconnue', 'fr')).toBeUndefined()
  })
})
