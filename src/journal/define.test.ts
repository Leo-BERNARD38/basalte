import { describe, expect, it } from 'vitest'

import { freeSlug, POST_FIELDS, slugify } from './define.js'

describe('slugify', () => {
  it('retire les accents, l’apostrophe et la ponctuation', () => {
    expect(slugify('L’atelier ouvre ses portes !')).toBe(
      'latelier-ouvre-ses-portes',
    )
    expect(slugify('Six essences de plus au séchoir')).toBe(
      'six-essences-de-plus-au-sechoir',
    )
  })

  it('ne laisse jamais un tiret en bout', () => {
    expect(slugify('  — Et alors ? —  ')).toBe('et-alors')
  })

  it('borne la longueur sans couper sur un tiret', () => {
    const long = slugify('a'.repeat(40) + ' ' + 'b'.repeat(40))

    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith('-')).toBe(false)
  })

  it('rend le vide pour un titre qui ne porte aucune lettre', () => {
    expect(slugify('!!! ???')).toBe('')
  })
})

describe('freeSlug', () => {
  it('rend le slug voulu quand il est libre', () => {
    expect(freeSlug('ouverture', new Set())).toBe('ouverture')
  })

  it('suffixe plutôt que d’écraser un billet existant', () => {
    expect(freeSlug('ouverture', new Set(['ouverture']))).toBe('ouverture-2')
    expect(freeSlug('ouverture', new Set(['ouverture', 'ouverture-2']))).toBe(
      'ouverture-3',
    )
  })

  it('rend undefined pour un titre vide', () => {
    expect(freeSlug('', new Set())).toBeUndefined()
  })
})

describe('POST_FIELDS', () => {
  it('borne le titre et le résumé comme « meta » les borne', () => {
    expect(POST_FIELDS.title.max).toBe(60)
    expect(POST_FIELDS.excerpt.max).toBe(160)
  })

  it('exige le titre, la date, le résumé et le texte', () => {
    expect(POST_FIELDS.title.required).toBe(true)
    expect(POST_FIELDS.date.required).toBe(true)
    expect(POST_FIELDS.excerpt.required).toBe(true)
    expect(POST_FIELDS.body.required).toBe(true)
  })

  it('ne traduit pas la date : c’est le rendu qui la met en forme', () => {
    expect('i18n' in POST_FIELDS.date).toBe(false)
  })

  it('laisse la couverture et les photos facultatives', () => {
    expect(POST_FIELDS.cover.required).toBe(false)
    expect(POST_FIELDS.gallery.required).toBe(false)
  })
})
