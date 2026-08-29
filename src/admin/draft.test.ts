import { describe, expect, it } from 'vitest'

import { describeFields } from '../fields/describe.js'
import { f } from '../fields/define.js'
import {
  emptyValue,
  emptyValues,
  move,
  remove,
  replace,
  sameDraft,
  translated,
  withLanguage,
} from './draft.js'

const LANGUAGES = ['fr', 'en']

const FIELDS = describeFields({
  title: f.text({ label: 'Titre', i18n: true }),
  image: f.image({ label: 'Image' }),
  choix: f.select({ label: 'Choix', options: [{ value: 'a', label: 'A' }] }),
  bouton: f.group({
    label: 'Bouton',
    fields: {
      label: f.text({ label: 'Texte', i18n: true }),
      href: f.url({ label: 'Lien' }),
    },
  }),
  points: f.list({ label: 'Points', of: { titre: f.text({ i18n: true }) } }),
})

function field(name: string) {
  const found = FIELDS.find((entry) => entry.name === name)

  if (found === undefined) throw new Error(`champ « ${name} » absent`)

  return found
}

describe('emptyValue', () => {
  it('donne une carte de langues à un champ traduisible', () => {
    expect(emptyValue(field('title'), LANGUAGES)).toEqual({ fr: '', en: '' })
  })

  it('donne une chaîne vide aux champs à valeur unique', () => {
    expect(emptyValue(field('image'), LANGUAGES)).toBe('')
    expect(emptyValue(field('choix'), LANGUAGES)).toBe('')
  })

  it('descend dans un groupe', () => {
    expect(emptyValue(field('bouton'), LANGUAGES)).toEqual({
      label: { fr: '', en: '' },
      href: '',
    })
  })

  it('donne une liste vide, jamais un élément d’office', () => {
    expect(emptyValue(field('points'), LANGUAGES)).toEqual([])
  })

  it('se déduit de la description, sans table écrite à la main', () => {
    expect(Object.keys(emptyValues(FIELDS, LANGUAGES))).toEqual([
      'title',
      'image',
      'choix',
      'bouton',
      'points',
    ])
  })
})

describe('move', () => {
  it('déplace un élément vers le bas puis vers le haut', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('ne bouge rien pour une position hors de la liste', () => {
    const items = ['a', 'b']

    expect(move(items, 0, 5)).toBe(items)
    expect(move(items, -1, 0)).toBe(items)
    expect(move(items, 1, 1)).toBe(items)
  })
})

describe('replace et remove', () => {
  it('rendent une nouvelle liste sans toucher l’ancienne', () => {
    const items = ['a', 'b', 'c']

    expect(replace(items, 1, 'x')).toEqual(['a', 'x', 'c'])
    expect(remove(items, 1)).toEqual(['a', 'c'])
    expect(items).toEqual(['a', 'b', 'c'])
  })
})

describe('sameDraft', () => {
  it('voit une différence de valeur', () => {
    const left = { meta: { a: 1 }, blocks: [] }

    expect(sameDraft(left, { meta: { a: 1 }, blocks: [] })).toBe(true)
    expect(sameDraft(left, { meta: { a: 2 }, blocks: [] })).toBe(false)
  })

  it('voit une différence d’ordre', () => {
    const section = { id: 'a', type: 'hero', hidden: {}, props: {} }
    const autre = { id: 'b', type: 'hero', hidden: {}, props: {} }

    expect(
      sameDraft(
        { meta: {}, blocks: [section, autre] },
        { meta: {}, blocks: [autre, section] },
      ),
    ).toBe(false)
  })
})

describe('translated et withLanguage', () => {
  it('lit la langue affichée, et rend vide pour une absente', () => {
    expect(translated({ fr: 'Bonjour' }, 'fr')).toBe('Bonjour')
    expect(translated({ fr: 'Bonjour' }, 'en')).toBe('')
    expect(translated(undefined, 'fr')).toBe('')
  })

  it('n’écrit que la langue affichée', () => {
    expect(withLanguage({ fr: 'Bonjour' }, 'en', 'Hello')).toEqual({
      fr: 'Bonjour',
      en: 'Hello',
    })
  })

  it('part d’une carte vide quand le champ n’en avait pas', () => {
    expect(withLanguage(undefined, 'fr', 'Bonjour')).toEqual({ fr: 'Bonjour' })
  })
})
