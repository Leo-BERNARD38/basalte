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

  it('couvre chaque niveau d’encre sur chacun des trois plans clairs', () => {
    const pairs = panelPairs()

    for (const level of Object.keys(tokens.ink)) {
      const backs = new Set(
        pairs
          .filter((pair) => pair.front === `ink.${level}`)
          .map((pair) => pair.back),
      )

      for (const surface of [
        'surface.canvas',
        'surface.card',
        'surface.raised',
      ]) {
        expect(backs.has(surface)).toBe(true)
      }
    }
  })

  it('lit aussi l’encre posée sur les deux fonds sombres', () => {
    const backs = new Set(
      panelPairs()
        .filter((pair) => pair.front.startsWith('onInk.'))
        .map((pair) => pair.back),
    )

    expect(backs).toEqual(new Set(['surface.ink', 'state.refused']))
  })

  // Le bandeau plein n’écrit qu’en blanc : ses deux niveaux se donnent par la
  // taille et la graisse. Une seconde encre y descendrait sous le plancher, et
  // c’est ce que cette borne empêche d’écrire par distraction.
  it('n’écrit que le blanc plein sur le bandeau de refus', () => {
    const fronts = panelPairs()
      .filter((pair) => pair.back === 'state.refused')
      .map((pair) => pair.front)

    expect(fronts).toEqual(['onInk.1'])
  })

  it('lit ce qui porte une valeur au seuil du graphique, le texte au sien', () => {
    const pairs = panelPairs()
    const bar = pairs.find((pair) => pair.front === 'mute.chart')
    const ink = pairs.find((pair) => pair.front === 'ink.1')

    expect(bar?.ratio).toBe(GRAPHIC_RATIO)
    expect(ink?.ratio).toBe(MINIMUM_RATIO)
  })

  it('tient dehors ce qui sépare ou décore, et le tient nommément', () => {
    const fronts = new Set(panelPairs().map((pair) => pair.front))

    // Le filet, la poignée au repos et le glyphe inerte ne portent aucune
    // information : les mesurer obligerait à les assombrir jusqu’à ce qu’ils
    // se lisent comme du contenu.
    expect(fronts.has('line')).toBe(false)
    expect(fronts.has('mute.draw')).toBe(false)
    expect(fronts.has('accent.glyph')).toBe(false)
  })

  it('refuserait une encre trop claire — la règle mord', () => {
    // Les deux valeurs qui étaient écrites avant D164, sur le plan le plus
    // sombre que le panel porte aujourd’hui.
    expect(contrast('#9ea3af', tokens.surface.canvas)).toBeLessThan(
      MINIMUM_RATIO,
    )
    expect(contrast('#71757f', tokens.surface.canvas)).toBeLessThan(
      MINIMUM_RATIO,
    )
  })
})
