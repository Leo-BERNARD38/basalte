import { describe, expect, it } from 'vitest'

import type { BlockRegistry } from '../blocks/define.js'
import { f } from '../fields/define.js'
import { defineSite, type Site } from '../site/define.js'
import { shareImageKey, shareTags } from './meta.js'

const site: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true } },
})

const registry: BlockRegistry = {
  hero: {
    name: 'hero',
    label: 'Bandeau',
    fields: { image: f.image({ label: 'Image' }) },
  },
  richtext: {
    name: 'richtext',
    label: 'Texte',
    fields: { body: f.textarea({ label: 'Texte' }) },
  },
}

const section = (type: string, props: unknown) => ({
  id: type,
  type,
  hidden: {},
  props: props as Readonly<Record<string, unknown>>,
})

const meta = (image = '') => ({ title: {}, description: {}, image })

describe('shareImageKey', () => {
  it('prend celle que la page déclare', () => {
    expect(shareImageKey({ meta: meta('aaa'), registry, sections: [] })).toBe(
      'aaa',
    )
  })

  it('retombe sur la première image d’une section, dans l’ordre de la page', () => {
    expect(
      shareImageKey({
        meta: meta(),
        registry,
        sections: [
          section('richtext', { body: 'un mot' }),
          section('hero', { image: 'bbb' }),
        ],
      }),
    ).toBe('bbb')
  })

  it('ne rend rien quand aucune section ne porte d’image', () => {
    expect(
      shareImageKey({
        meta: meta(),
        registry,
        sections: [section('richtext', { body: 'un mot' })],
      }),
    ).toBe('')
  })
})

describe('shareTags', () => {
  const base = {
    site,
    title: 'Atelier Duvallon',
    description: 'Menuiserie sur mesure.',
    url: 'https://atelier-duvallon.fr/',
    language: 'fr',
  }

  const content = (
    tags: readonly { property?: string; name?: string; content: string }[],
    key: string,
  ) => tags.find((tag) => tag.property === key || tag.name === key)?.content

  it('pose la carte simple quand il n’y a pas d’image', () => {
    const tags = shareTags(base)

    expect(content(tags, 'twitter:card')).toBe('summary')
    expect(content(tags, 'og:image')).toBeUndefined()
    expect(content(tags, 'og:url')).toBe('https://atelier-duvallon.fr/')
  })

  it('pose la carte large avec les dimensions de l’image', () => {
    const tags = shareTags({
      ...base,
      image: {
        src: 'https://atelier-duvallon.fr/media/aaa-1200.webp',
        width: 1200,
        height: 630,
        alt: 'Un établi',
      },
    })

    expect(content(tags, 'twitter:card')).toBe('summary_large_image')
    expect(content(tags, 'og:image:width')).toBe('1200')
    expect(content(tags, 'og:image:alt')).toBe('Un établi')
  })

  it('omet la description quand elle est vide plutôt que d’en poser une vide', () => {
    expect(
      content(shareTags({ ...base, description: '' }), 'og:description'),
    ).toBeUndefined()
  })
})
