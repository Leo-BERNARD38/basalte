import { describe, expect, it } from 'vitest'

import { matchesRatio, parseRatio } from './ratio.js'

describe('parseRatio', () => {
  it('lit deux nombres séparés d’une barre', () => {
    expect(parseRatio('16/9')).toBeCloseTo(16 / 9)
    expect(parseRatio(' 4 / 5 ')).toBeCloseTo(0.8)
    expect(parseRatio('1200/630')).toBeCloseTo(1200 / 630)
  })

  it('refuse ce qui n’est pas des proportions', () => {
    for (const written of ['16:9', '16', '', 'seize/neuf', '0/9', '16/0']) {
      expect(parseRatio(written)).toBeUndefined()
    }
  })
})

describe('matchesRatio', () => {
  it('accepte l’arrondi du découpage en pixels entiers', () => {
    expect(matchesRatio({ width: 1600, height: 900 }, '16/9')).toBe(true)
    expect(matchesRatio({ width: 1601, height: 900 }, '16/9')).toBe(true)
  })

  it('refuse un format qui n’est pas celui attendu', () => {
    expect(matchesRatio({ width: 1600, height: 1200 }, '16/9')).toBe(false)
    expect(matchesRatio({ width: 1000, height: 1000 }, '4/5')).toBe(false)
  })

  it('n’accuse pas l’image quand le champ écrit n’importe quoi', () => {
    expect(matchesRatio({ width: 1600, height: 1200 }, '16:9')).toBe(true)
  })
})
