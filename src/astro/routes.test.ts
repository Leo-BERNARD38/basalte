import { describe, expect, it } from 'vitest'

import { slugFor, urlFor } from './routes.js'

describe('slugFor', () => {
  it('laisse la racine sans segment dans la langue par défaut', () => {
    expect(slugFor('/', '')).toBeUndefined()
    expect(slugFor('/contact', '')).toBe('contact')
  })

  it('préfixe les autres langues de leur code', () => {
    expect(slugFor('/', 'en')).toBe('en')
    expect(slugFor('/contact', 'en')).toBe('en/contact')
  })
})

describe('urlFor', () => {
  it('rend une URL absolue depuis la racine du site', () => {
    expect(urlFor('/', '')).toBe('/')
    expect(urlFor('/contact', '')).toBe('/contact')
    expect(urlFor('/', 'en')).toBe('/en')
    expect(urlFor('/contact', 'en')).toBe('/en/contact')
  })
})
