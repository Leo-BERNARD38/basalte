import { describe, expect, it } from 'vitest'

import { resolveLanguages } from '../site/languages.js'
import { f } from './define.js'
import { toZod } from './schema.js'

const mono = resolveLanguages({ fr: { default: true } })
const withDraft = resolveLanguages({
  fr: { default: true },
  en: { draft: true },
})
const bothOnline = resolveLanguages({ fr: { default: true }, en: {} })

function check(fields: Parameters<typeof toZod>[0], languages = mono) {
  const schema = toZod(fields, languages)
  return (value: unknown) => schema.safeParse(value)
}

describe('toZod — champs plats', () => {
  it('accepte une valeur plate sur un champ non traduisible', () => {
    const parse = check({ href: f.url() })

    expect(parse({ href: '/contact' }).success).toBe(true)
  })

  it('refuse une valeur vide sur un champ requis', () => {
    const parse = check({ href: f.url({ required: true }) })

    expect(parse({ href: '' }).success).toBe(false)
    expect(parse({ href: '/contact' }).success).toBe(true)
  })

  it('applique la borne haute et nomme le champ fautif', () => {
    const parse = check({ title: f.text({ max: 5 }) })
    const result = parse({ title: 'beaucoup trop long' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      code: 'too_big',
      maximum: 5,
      path: ['title'],
    })
  })

  it('n’accepte qu’une valeur de la liste, ou rien si le champ est libre', () => {
    const options = [
      { value: 'gauche', label: 'À gauche' },
      { value: 'droite', label: 'À droite' },
    ]
    const parse = check({ side: f.select({ options }) })

    expect(parse({ side: 'gauche' }).success).toBe(true)
    expect(parse({ side: '' }).success).toBe(true)
    expect(parse({ side: 'centre' }).success).toBe(false)
  })

  it('un lien externe refuse un chemin interne', () => {
    const parse = check({ href: f.url({ external: true, required: true }) })

    expect(parse({ href: 'https://exemple.fr' }).success).toBe(true)
    expect(parse({ href: '/contact' }).success).toBe(false)
  })

  it('un lien refuse un schéma que le rendu n’autorise pas', () => {
    const parse = check({ href: f.url({ required: true }) })

    expect(parse({ href: 'javascript:alert(1)' }).success).toBe(false)
    expect(parse({ href: 'mailto:bonjour@exemple.fr' }).success).toBe(true)
  })

  it('un lien interne commence par une barre, jamais par deux', () => {
    const parse = check({ href: f.url({ required: true }) })

    expect(parse({ href: '/' }).success).toBe(true)
    expect(parse({ href: '/contact' }).success).toBe(true)
    expect(parse({ href: '//exemple.net' }).success).toBe(false)
    expect(parse({ href: '//exemple.net/page' }).success).toBe(false)
  })
})

describe('toZod — langues', () => {
  it('attend une valeur par langue en ligne', () => {
    const parse = check({ title: f.text({ i18n: true }) }, bothOnline)

    expect(parse({ title: { fr: 'Bonjour', en: 'Hello' } }).success).toBe(true)
    expect(parse({ title: { fr: 'Bonjour' } }).success).toBe(false)
  })

  it('situe l’erreur sur la langue fautive', () => {
    const parse = check({ title: f.text({ i18n: true, max: 5 }) }, bothOnline)
    const result = parse({ title: { fr: 'Salut', en: 'Beaucoup trop long' } })

    expect(result.error?.issues[0]?.path).toEqual(['title', 'en'])
  })

  it('une langue en préparation ne bloque jamais', () => {
    const fields = { title: f.text({ i18n: true, max: 5, required: true }) }
    const parse = check(fields, withDraft)

    expect(parse({ title: { fr: 'Salut' } }).success).toBe(true)
    expect(parse({ title: { fr: 'Salut', en: '' } }).success).toBe(true)
    expect(
      parse({ title: { fr: 'Salut', en: 'Beaucoup trop long' } }).success,
    ).toBe(true)
  })

  it('exige la traduction dès que la langue est en ligne', () => {
    const fields = { title: f.text({ i18n: true, required: true }) }

    expect(
      toZod(fields, withDraft).safeParse({ title: { fr: 'A' } }).success,
    ).toBe(true)
    expect(
      toZod(fields, bothOnline).safeParse({ title: { fr: 'A' } }).success,
    ).toBe(false)
  })

  it('exige la traduction d’un champ rempli, même non requis', () => {
    const parse = check({ title: f.text({ i18n: true }) }, bothOnline)

    expect(parse({ title: { fr: '', en: '' } }).success).toBe(true)
    const result = parse({ title: { fr: 'Bonjour', en: '   ' } })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      code: 'custom',
      path: ['title', 'en'],
      params: { rule: 'translation-missing' },
    })
  })

  it('conserve une traduction dont la langue n’est plus déclarée (D86)', () => {
    const parse = check({ title: f.text({ i18n: true }) }, mono)
    const result = parse({ title: { fr: 'Bonjour', de: 'Hallo' } })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ title: { fr: 'Bonjour', de: 'Hallo' } })
  })

  it('refuse une traduction qui n’est pas du texte', () => {
    const parse = check({ title: f.text({ i18n: true }) }, mono)

    expect(parse({ title: { fr: 'Bonjour', de: 12 } }).success).toBe(false)
  })
})

describe('toZod — structures', () => {
  it('descend dans un groupe', () => {
    const parse = check(
      {
        cta: f.group({
          fields: {
            label: f.text({ i18n: true, required: true }),
            href: f.url(),
          },
        }),
      },
      bothOnline,
    )

    expect(
      parse({ cta: { label: { fr: 'Aller', en: 'Go' }, href: '/x' } }).success,
    ).toBe(true)
    expect(
      parse({ cta: { label: { fr: 'Aller', en: '' }, href: '/x' } }).success,
    ).toBe(false)
  })

  // Les deux moitiés de la règle « tout champ absent vaut vide » : ce qui est
  // facultatif rend le vide, ce qui est requis est refusé par sa borne. Zod 4
  // ne retraverse pas un `default`, d’où `prefault` — sans quoi un `required`
  // ne vaut que pour une clé présente, et un groupe absent reste un objet vide
  // que le composant du bloc lit comme `props.labels.name`.
  it('remplit un groupe absent jusqu’à ses champs', () => {
    const parse = check(
      {
        labels: f.group({
          fields: { name: f.text({ i18n: true }), submit: f.text() },
        }),
      },
      mono,
    )

    const parsed = parse({})

    expect(parsed.success).toBe(true)

    if (parsed.success) {
      expect(parsed.data).toEqual({ labels: { name: { fr: '' }, submit: '' } })
    }
  })

  it('refuse un champ requis dont la clé manque, quel qu’il soit', () => {
    for (const fields of [
      { v: f.url({ required: true }) },
      { v: f.image({ required: true }) },
      { v: f.document({ required: true }) },
      { v: f.richtext({ required: true }) },
      { v: f.text({ required: true }) },
      { v: f.list({ of: { title: f.text() }, min: 1 }) },
    ]) {
      expect(check(fields)({}).success).toBe(false)
    }
  })

  it('rend le vide d’un champ facultatif dont la clé manque', () => {
    const parsed = check({
      href: f.url(),
      image: f.image(),
      body: f.richtext(),
      note: f.textarea(),
      items: f.list({ of: { title: f.text() } }),
    })({})

    expect(parsed.success).toBe(true)

    if (parsed.success) {
      expect(parsed.data).toEqual({
        href: '',
        image: '',
        body: '',
        note: '',
        items: [],
      })
    }
  })

  it('borne le nombre d’éléments d’une liste', () => {
    const parse = check({
      items: f.list({ of: { title: f.text() }, min: 1, max: 2 }),
    })

    expect(parse({ items: [] }).success).toBe(false)
    expect(parse({ items: [{ title: 'a' }] }).success).toBe(true)
    expect(
      parse({ items: [{ title: 'a' }, { title: 'b' }, { title: 'c' }] })
        .success,
    ).toBe(false)
  })

  it('situe l’erreur sur l’élément fautif d’une liste', () => {
    const parse = check({
      items: f.list({ of: { title: f.text({ max: 3 }) } }),
    })
    const result = parse({ items: [{ title: 'ok' }, { title: 'trop long' }] })

    expect(result.error?.issues[0]?.path).toEqual(['items', 1, 'title'])
  })
})
