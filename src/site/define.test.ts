import { describe, expect, it } from 'vitest'

import { defineSite } from './define.js'

const minimal = {
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true } },
}

describe('defineSite', () => {
  it('résout les langues et complète les tokens', () => {
    const site = defineSite(minimal)

    expect(site.languages.default.code).toBe('fr')
    expect(site.tokens.color.bg).toMatch(/^#/)
  })

  it('applique les tokens du site par-dessus ceux du socle', () => {
    const site = defineSite({
      ...minimal,
      tokens: { color: { fg: '#101010' } },
    })

    expect(site.tokens.color.fg).toBe('#101010')
  })

  it('garde la graine du panel en minuscules, et refuse ce qui n’en est pas une', () => {
    expect(
      defineSite({ ...minimal, panel: { seed: '#2F5BEA' } }).panel,
    ).toEqual({ seed: '#2f5bea' })
    expect(defineSite(minimal).panel).toBeUndefined()
    expect(() => defineSite({ ...minimal, panel: { seed: 'bleu' } })).toThrow(
      /graine/,
    )
    expect(() => defineSite({ ...minimal, panel: { seed: '#fff' } })).toThrow(
      /graine/,
    )
  })

  it('refuse un nom vide', () => {
    expect(() => defineSite({ ...minimal, name: '  ' })).toThrow(/nom du site/)
  })

  it('refuse un domaine porteur d’un schéma ou d’un chemin', () => {
    expect(() =>
      defineSite({ ...minimal, domain: 'https://exemple.fr' }),
    ).toThrow(/domaine/)
    expect(() => defineSite({ ...minimal, domain: 'exemple.fr/blog' })).toThrow(
      /domaine/,
    )
    expect(() => defineSite({ ...minimal, domain: 'exemple' })).toThrow(
      /domaine/,
    )
  })
})
