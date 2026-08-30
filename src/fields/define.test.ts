import { describe, expect, expectTypeOf, it } from 'vitest'

import { f, FIELD_TYPES } from './define.js'
import type { Translated, Value } from './types.js'

describe('f', () => {
  it('documente chacun de ses types, et rien de plus', () => {
    expect(FIELD_TYPES.map((type) => type.kind)).toEqual(Object.keys(f))
  })

  it('pose des valeurs par défaut sûres', () => {
    const field = f.text()

    expect(field.kind).toBe('text')
    expect(field.i18n).toBe(false)
    expect(field.required).toBe(false)
  })

  it('conserve les options déclarées', () => {
    const field = f.text({
      label: 'Titre',
      i18n: true,
      max: 80,
      required: true,
    })

    expect(field).toMatchObject({
      label: 'Titre',
      i18n: true,
      max: 80,
      required: true,
    })
  })

  it('déclare un document par sa seule clé, jamais traduite', () => {
    const field = f.document({ label: 'Nos conditions générales' })

    expect(field.kind).toBe('document')
    expect(field.required).toBe(false)
    expectTypeOf<Value<typeof field>>().toEqualTypeOf<string>()
  })

  it('un champ traduisible se type par langue, un autre non', () => {
    expectTypeOf<Value<ReturnType<typeof title>>>().toEqualTypeOf<
      Translated<string>
    >()
    expectTypeOf<Value<ReturnType<typeof href>>>().toEqualTypeOf<string>()
  })

  it('un groupe se type depuis ses champs', () => {
    const cta = f.group({
      fields: { label: f.text({ i18n: true }), href: f.url() },
    })

    expectTypeOf<Value<typeof cta>>().toEqualTypeOf<{
      readonly label: Translated<string>
      readonly href: string
    }>()
  })

  it('une liste se type comme une suite de ses éléments', () => {
    const items = f.list({ of: { title: f.text() } })

    expectTypeOf<Value<typeof items>>().toEqualTypeOf<
      readonly { readonly title: string }[]
    >()
  })
})

const title = () => f.text({ i18n: true })
const href = () => f.url()
