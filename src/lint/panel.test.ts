import { describe, expect, it } from 'vitest'

import { tokens } from '../admin/tokens.js'
import { contrast, MINIMUM_RATIO } from './contrast.js'
import {
  GRAPHIC_RATIO,
  panelContrast,
  panelPairs,
  seedContrast,
} from './panel.js'

const PLANES = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
]

describe('le plancher de contraste du panel', () => {
  it('tient sur chaque paire que le panel superpose vraiment', () => {
    const failing = panelPairs()
      .map((pair) => ({
        pair,
        measured: contrast(pair.frontValue, pair.backValue) ?? 0,
      }))
      .filter((entry) => entry.measured < entry.pair.ratio)
      .map(
        (entry) =>
          `${entry.pair.front} sur ${entry.pair.back} : ${entry.measured.toFixed(2)} < ${entry.pair.ratio}`,
      )

    expect(failing).toEqual([])
  })

  it('ne rend aucune remarque tant que les tokens tiennent', () => {
    expect(panelContrast('src/admin/tokens.ts')).toEqual([])
  })

  it('couvre les deux encres sur la surface et ses cinq conteneurs, dans les deux modes', () => {
    const pairs = panelPairs()

    for (const mode of ['light', 'dark']) {
      for (const ink of ['onSurface', 'onSurfaceVariant']) {
        const backs = new Set(
          pairs
            .filter((pair) => pair.front === `${mode}.${ink}`)
            .map((pair) => pair.back),
        )

        for (const plane of PLANES) {
          expect(
            backs.has(`${mode}.${plane}`),
            `${mode}.${ink} sur ${plane}`,
          ).toBe(true)
        }
      }
    }
  })

  it('lit la snackbar : ses deux encres sur la surface inverse', () => {
    const fronts = new Set(
      panelPairs()
        .filter((pair) => pair.back === 'light.inverseSurface')
        .map((pair) => pair.front),
    )

    expect(fronts).toEqual(
      new Set(['light.inverseOnSurface', 'light.inversePrimary']),
    )
  })

  it('lit ce qui porte une valeur au seuil du graphique, le texte au sien', () => {
    const pairs = panelPairs()
    const bar = pairs.find(
      (pair) => pair.front === 'light.primary' && pair.ratio === GRAPHIC_RATIO,
    )
    const ink = pairs.find((pair) => pair.front === 'light.onSurface')

    expect(bar).toBeDefined()
    expect(ink?.ratio).toBe(MINIMUM_RATIO)
  })

  it('tient dehors ce qui sépare ou décore, et le tient nommément', () => {
    const fronts = new Set(panelPairs().map((pair) => pair.front))

    // Le filet entre deux plans ne porte aucune information : le mesurer
    // obligerait à l’assombrir jusqu’à ce qu’il se lise comme du contenu.
    expect(fronts.has('light.outlineVariant')).toBe(false)
    expect(fronts.has('dark.outlineVariant')).toBe(false)
    expect(fronts.has('light.scrim')).toBe(false)
  })

  it('mesure la graine d’un site, et n’a rien à redire à une couleur franche', () => {
    expect(seedContrast('site.config.ts', '#2f5bea')).toEqual([])
  })

  it('refuserait une encre trop claire — la règle mord', () => {
    expect(contrast('#9ea3af', tokens.color.light.surface)).toBeLessThan(
      MINIMUM_RATIO,
    )
    expect(contrast('#71757f', tokens.color.light.surface)).toBeLessThan(
      MINIMUM_RATIO,
    )
  })
})
