import { describe, expect, it } from 'vitest'

import { resolveTokens } from '../site/tokens.js'
import { contrast, contrastFindings, MINIMUM_RATIO } from './contrast.js'

describe('contrast', () => {
  it('rend les deux extrêmes connus', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('lit les trois notations, et se tait sur ce qu’il ne lit pas', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 1)
    expect(contrast('rgb(0, 0, 0)', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('oklch(0.7 0.1 200)', '#ffffff')).toBeUndefined()
  })
})

describe('contrastFindings', () => {
  it('ne reproche rien aux tokens du socle', () => {
    expect(contrastFindings('site.config.ts', resolveTokens())).toEqual([])
  })

  it('refuse un accent illisible sous son propre texte', () => {
    const tokens = resolveTokens({
      color: { accent: '#ffe600', accentFg: '#ffffff' },
    })
    const found = contrastFindings('site.config.ts', tokens)

    expect(found).toHaveLength(1)
    expect(found[0]?.rule).toBe('design/contrast')
    expect(found[0]?.message).toContain(String(MINIMUM_RATIO))
  })

  it('attrape un texte secondaire trop pâle', () => {
    const tokens = resolveTokens({ color: { muted: '#d8d8d8' } })

    expect(
      contrastFindings('site.config.ts', tokens).map((entry) => entry.message),
    ).toContainEqual(expect.stringContaining('color.muted'))
  })
})
