import { describe, expect, it } from 'vitest'

import { tokens } from '../admin/tokens.js'
import { contrast, MINIMUM_RATIO } from './contrast.js'
import { GRAPHIC_RATIO, panelContrast, panelPairs } from './panel.js'

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

  it('couvre chaque niveau d’encre sur chacun des quatre plans', () => {
    const pairs = panelPairs()

    for (const level of Object.keys(tokens.ink)) {
      const backs = new Set(
        pairs
          .filter((pair) => pair.front === `ink.${level}`)
          .map((pair) => pair.back),
      )

      for (const surface of [
        'surface.bg',
        'surface.card',
        'surface.hover',
        'surface.sunken',
      ]) {
        expect(backs.has(surface)).toBe(true)
      }
    }
  })

  it('lit le trait dessiné au seuil du graphique, l’encre à celui du texte', () => {
    const pairs = panelPairs()
    const line = pairs.find((pair) => pair.front === 'line')
    const ink = pairs.find((pair) => pair.front === 'ink.1')

    expect(line?.ratio).toBe(GRAPHIC_RATIO)
    expect(ink?.ratio).toBe(MINIMUM_RATIO)
  })

  it('refuserait une encre trop claire — la règle mord', () => {
    // La valeur qui était écrite avant D164, sur le plan le plus sombre.
    expect(contrast('#9ea3af', tokens.surface.sunken)).toBeLessThan(
      MINIMUM_RATIO,
    )
    expect(contrast('#71757f', tokens.surface.sunken)).toBeLessThan(
      MINIMUM_RATIO,
    )
  })
})
