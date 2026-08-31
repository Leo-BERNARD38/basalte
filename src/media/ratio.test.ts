import { describe, expect, it } from 'vitest'

import { boxFor, matchesRatio, parseRatio, pixelBox, ratioOf } from './ratio.js'

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

describe('boxFor', () => {
  it('prend toute la largeur d’une image plus haute que le format', () => {
    const box = boxFor({ width: 1000, height: 1000 }, '16/9')

    expect(box.width).toBe(100)
    expect(box.height).toBeCloseTo(56.25)
    expect(
      ratioOf({ width: box.width * 1000, height: box.height * 1000 }),
    ).toBeCloseTo(16 / 9)
  })

  it('prend toute la hauteur d’une image plus large que le format', () => {
    const box = boxFor({ width: 2000, height: 1000 }, '16/9')

    expect(box.height).toBe(100)
    expect(box.width).toBeCloseTo(88.888, 2)
  })

  it('rend l’image entière quand elle est déjà au format', () => {
    expect(boxFor({ width: 1600, height: 900 }, '16/9')).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it('se centre sur le point focal sans jamais sortir de l’image', () => {
    const box = boxFor({ width: 2000, height: 1000 }, '16/9', { x: 95, y: 50 })

    expect(box.x).toBeCloseTo(100 - box.width)
    expect(box.x + box.width).toBeLessThanOrEqual(100)
  })
})

describe('pixelBox', () => {
  it('traduit un pourcentage en pixels entiers', () => {
    expect(
      pixelBox(
        { width: 2000, height: 1000 },
        { x: 10, y: 20, width: 50, height: 40 },
      ),
    ).toEqual({ left: 200, top: 200, width: 1000, height: 400 })
  })

  it('referme le cadre sur l’image : sharp refuse une extraction qui déborde', () => {
    const box = pixelBox(
      { width: 999, height: 501 },
      { x: 99.9, y: 99.9, width: 100, height: 100 },
    )

    expect(box.left + box.width).toBeLessThanOrEqual(999)
    expect(box.top + box.height).toBeLessThanOrEqual(501)
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
  })
})
