import { describe, expect, it } from 'vitest'

import type { BlockRegistry } from '../blocks/define.js'
import { f } from '../fields/define.js'
import { countMediaUsage } from './usage.js'

const REGISTRY: BlockRegistry = {
  hero: {
    name: 'hero',
    label: 'Bandeau',
    fields: { image: f.image({ label: 'Image' }) },
  },
  gallery: {
    name: 'gallery',
    label: 'Galerie',
    fields: {
      items: f.list({
        label: 'Images',
        of: {
          image: f.image({ label: 'Image' }),
          caption: f.text({ label: 'Légende', i18n: true }),
        },
      }),
    },
  },
  aside: {
    name: 'aside',
    label: 'Encadré',
    fields: {
      card: f.group({
        label: 'Carte',
        fields: { image: f.image({ label: 'Image' }) },
      }),
    },
  },
}

function page(blocks: readonly { type: string; props: unknown }[]) {
  return {
    meta: {},
    blocks: blocks.map((block, index) => ({
      id: `b${index}`,
      type: block.type,
      hidden: {},
      props: block.props as Readonly<Record<string, unknown>>,
    })),
  }
}

describe('countMediaUsage', () => {
  it('compte une image citée par une section', () => {
    const usage = countMediaUsage(REGISTRY, [
      page([{ type: 'hero', props: { image: 'aaa' } }]),
    ])

    expect(usage.get('aaa')).toBe(1)
  })

  it('descend dans les listes et dans les groupes', () => {
    const usage = countMediaUsage(REGISTRY, [
      page([
        {
          type: 'gallery',
          props: { items: [{ image: 'aaa' }, { image: 'bbb' }] },
        },
        { type: 'aside', props: { card: { image: 'aaa' } } },
      ]),
    ])

    expect(usage.get('aaa')).toBe(2)
    expect(usage.get('bbb')).toBe(1)
  })

  it('additionne les pages', () => {
    const usage = countMediaUsage(REGISTRY, [
      page([{ type: 'hero', props: { image: 'aaa' } }]),
      page([{ type: 'hero', props: { image: 'aaa' } }]),
    ])

    expect(usage.get('aaa')).toBe(2)
  })

  it('ignore une valeur vide et un type inconnu', () => {
    const usage = countMediaUsage(REGISTRY, [
      page([
        { type: 'hero', props: { image: '   ' } },
        { type: 'inconnu', props: { image: 'aaa' } },
      ]),
    ])

    expect(usage.size).toBe(0)
  })

  it('ne rend rien pour une image que personne n’emploie', () => {
    const usage = countMediaUsage(REGISTRY, [page([])])

    expect(usage.get('aaa')).toBeUndefined()
  })
})
