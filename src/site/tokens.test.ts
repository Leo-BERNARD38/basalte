import { describe, expect, it } from 'vitest'

import { resolveTokens, tokensToCss } from './tokens.js'

describe('resolveTokens', () => {
  it('sans réglage, rend le jeu complet du socle', () => {
    const tokens = resolveTokens()

    expect(tokens.color.bg).toMatch(/^#/)
    expect(Object.keys(tokens.space)).toHaveLength(8)
    expect(Object.keys(tokens.text)).toEqual([
      'xs',
      'sm',
      'base',
      'lg',
      'xl',
      '2xl',
      '3xl',
    ])
  })

  it('ne remplace que ce que le site déclare', () => {
    const base = resolveTokens()
    const tokens = resolveTokens({ color: { accent: '#c81e5a' } })

    expect(tokens.color.accent).toBe('#c81e5a')
    expect(tokens.color.bg).toBe(base.color.bg)
  })

  it('refuse une famille que le socle ne porte pas', () => {
    expect(() => resolveTokens({ shadow: { md: '0 0 1px' } } as never)).toThrow(
      /« shadow »/,
    )
  })

  it('refuse un token que le socle ne porte pas', () => {
    expect(() =>
      resolveTokens({ color: { brand: '#000000' } } as never),
    ).toThrow(/« color.brand »/)
  })
})

describe('tokensToCss', () => {
  it('nomme les variables comme design.md les décrit', () => {
    const css = tokensToCss(resolveTokens())

    expect(css).toContain('--color-accent-fg:')
    expect(css).toContain('--text-3xl:')
    expect(css).toContain('--space-1:')
    expect(css).toContain('--width-content:')
    expect(css).toContain('--font-title:')
    expect(css).toContain('--radius-sm:')
  })

  it('porte les variables sur :root', () => {
    const css = tokensToCss(resolveTokens({ color: { fg: '#101010' } }))

    expect(css.startsWith(':root{')).toBe(true)
    expect(css.endsWith('}')).toBe(true)
    expect(css).toContain('--color-fg:#101010')
  })
})
