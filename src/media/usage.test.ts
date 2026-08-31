import { describe, expect, it } from 'vitest'

import type { BlockRegistry } from '../blocks/define.js'
import { f } from '../fields/define.js'
import type { MediaEntry, MediaManifest } from './manifest.js'
import {
  checkRatios,
  countMediaUsage,
  unusedMedia,
  withLineage,
} from './usage.js'

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

const RATIOED: BlockRegistry = {
  hero: {
    name: 'hero',
    label: 'Bandeau',
    fields: { image: f.image({ label: 'Image', ratio: '16/9' }) },
  },
  free: {
    name: 'free',
    label: 'Libre',
    fields: { image: f.image({ label: 'Image' }) },
  },
}

function entry(width: number, height: number, source?: string): MediaEntry {
  return {
    format: 'webp',
    width,
    height,
    widths: [width],
    alt: {},
    ...(source === undefined ? {} : { source }),
  }
}

describe('withLineage', () => {
  it('reporte sur l’originale les emplois de son recadrage', () => {
    const manifest: MediaManifest = {
      aaa: entry(1600, 1200),
      bbb: entry(1600, 900, 'aaa'),
    }

    const usage = withLineage(
      countMediaUsage(REGISTRY, [
        page([{ type: 'hero', props: { image: 'bbb' } }]),
      ]),
      manifest,
    )

    expect(usage.get('bbb')).toBe(1)
    expect(usage.get('aaa')).toBe(1)
  })

  it('laisse orpheline une originale dont aucun recadrage n’est employé', () => {
    const manifest: MediaManifest = {
      aaa: entry(1600, 1200),
      bbb: entry(1600, 900, 'aaa'),
    }

    const usage = withLineage(countMediaUsage(REGISTRY, [page([])]), manifest)

    expect(usage.get('aaa')).toBeUndefined()
  })
})

describe('unusedMedia', () => {
  it('nomme une image que plus aucune section ne cite', () => {
    expect(
      unusedMedia({
        keys: ['aaa', 'bbb'],
        registry: REGISTRY,
        pages: [page([{ type: 'hero', props: { image: 'aaa' } }])],
        manifest: { aaa: entry(1600, 1200), bbb: entry(1600, 1200) },
        kind: 'image',
      }),
    ).toEqual(['bbb'])
  })

  it('garde l’originale d’un recadrage employé, dont il faut repartir', () => {
    expect(
      unusedMedia({
        keys: ['aaa', 'bbb'],
        registry: REGISTRY,
        pages: [page([{ type: 'hero', props: { image: 'bbb' } }])],
        manifest: { aaa: entry(1600, 1200), bbb: entry(1600, 900, 'aaa') },
        kind: 'image',
      }),
    ).toEqual([])
  })
})

describe('checkRatios', () => {
  const named = (blocks: readonly { type: string; props: unknown }[]) => ({
    name: 'accueil',
    ...page(blocks),
  })

  it('signale une image qui ne tient pas le format de son emplacement', () => {
    const issues = checkRatios(
      RATIOED,
      [named([{ type: 'hero', props: { image: 'aaa' } }])],
      { aaa: entry(1600, 1200) },
    )

    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.page).toBe('accueil')
    expect(issues[0]?.section?.label).toBe('Bandeau')
    expect(issues[0]?.message).toContain('1600×1200')
    expect(issues[0]?.message).toContain('16/9')
  })

  it('se tait quand l’image est au format', () => {
    expect(
      checkRatios(
        RATIOED,
        [named([{ type: 'hero', props: { image: 'aaa' } }])],
        { aaa: entry(1600, 900) },
      ),
    ).toEqual([])
  })

  it('se tait quand l’emplacement ne déclare aucun format', () => {
    expect(
      checkRatios(
        RATIOED,
        [named([{ type: 'free', props: { image: 'aaa' } }])],
        { aaa: entry(1600, 1200) },
      ),
    ).toEqual([])
  })

  it('se tait sur une image absente du manifeste : ce défaut a son propre message', () => {
    expect(
      checkRatios(
        RATIOED,
        [named([{ type: 'hero', props: { image: 'zzz' } }])],
        {},
      ),
    ).toEqual([])
  })
})
