import { describe, expect, it } from 'vitest'

import { resolveLanguages } from './languages.js'

describe('resolveLanguages', () => {
  it('un site monolingue a sa langue en ligne et aucune en préparation', () => {
    const languages = resolveLanguages({ fr: { default: true } })

    expect(languages.codes).toEqual(['fr'])
    expect(languages.onlineCodes).toEqual(['fr'])
    expect(languages.draft).toEqual([])
    expect(languages.default.code).toBe('fr')
  })

  it('sépare les langues en ligne de celles en préparation', () => {
    const languages = resolveLanguages({
      fr: { default: true },
      en: { draft: true },
      es: {},
    })

    expect(languages.codes).toEqual(['fr', 'en', 'es'])
    expect(languages.onlineCodes).toEqual(['fr', 'es'])
    expect(languages.draft.map((language) => language.code)).toEqual(['en'])
  })

  it('conserve l’ordre de déclaration', () => {
    const languages = resolveLanguages({ en: {}, fr: { default: true } })

    expect(languages.codes).toEqual(['en', 'fr'])
  })

  it('refuse un site sans langue', () => {
    expect(() => resolveLanguages({})).toThrow(/au moins une langue/)
  })

  it('refuse un site sans langue par défaut', () => {
    expect(() => resolveLanguages({ fr: {}, en: {} })).toThrow(
      /une langue par défaut/,
    )
  })

  it('refuse deux langues par défaut', () => {
    expect(() =>
      resolveLanguages({ fr: { default: true }, en: { default: true } }),
    ).toThrow(/une seule langue par défaut/)
  })

  it('refuse une langue par défaut en préparation', () => {
    expect(() =>
      resolveLanguages({ fr: { default: true, draft: true } }),
    ).toThrow(/ne peut pas être en préparation/)
  })

  it('refuse un code de langue qui n’est pas un code court', () => {
    expect(() => resolveLanguages({ 'fr-FR!': { default: true } })).toThrow(
      /code de langue/,
    )
  })
})
