import { describe, expect, it } from 'vitest'

import { describeFields } from './describe.js'
import { f } from './define.js'

describe('describeFields', () => {
  it('reprend le nom du champ quand aucun libellé n’est donné', () => {
    expect(describeFields({ title: f.text() })[0]).toMatchObject({
      name: 'title',
      label: 'title',
      kind: 'text',
      required: false,
      i18n: false,
    })
  })

  it('porte les contraintes que le panel doit appliquer', () => {
    const [description] = describeFields({
      title: f.text({ label: 'Titre', i18n: true, max: 80, required: true }),
    })

    expect(description).toMatchObject({ label: 'Titre', i18n: true, max: 80 })
  })

  it('descend dans un groupe et dans une liste', () => {
    const [group, list] = describeFields({
      cta: f.group({ fields: { href: f.url() } }),
      items: f.list({ of: { title: f.text() }, itemLabel: 'title', max: 6 }),
    })

    expect(group?.fields?.[0]?.name).toBe('href')
    expect(list?.fields?.[0]?.name).toBe('title')
    expect(list).toMatchObject({ itemLabel: 'title', max: 6 })
  })

  it('reste sérialisable en JSON', () => {
    const described = describeFields({
      side: f.select({ options: [{ value: 'g', label: 'Gauche' }] }),
    })

    expect(JSON.parse(JSON.stringify(described))).toEqual(described)
  })
})

describe('describeFields — bornes effectives', () => {
  // Le panel décide sur ces bornes s’il laisse retirer un élément. Rendre la
  // borne écrite plutôt que celle qui s’applique le laisserait vider une liste
  // que l’enregistrement refuse ensuite.
  it('relève le minimum d’une liste requise à un', () => {
    const [description] = describeFields({
      items: f.list({ of: { title: f.text() }, required: true }),
    })

    expect(description?.min).toBe(1)
  })

  it('garde la borne écrite quand elle est plus haute', () => {
    const [description] = describeFields({
      items: f.list({ of: { title: f.text() }, required: true, min: 3 }),
    })

    expect(description?.min).toBe(3)
  })

  it('n’annonce aucun minimum quand rien ne l’impose', () => {
    const [description] = describeFields({
      items: f.list({ of: { title: f.text() } }),
    })

    expect(description?.min).toBe(undefined)
  })

  it('relève aussi le minimum d’un texte requis', () => {
    const [description] = describeFields({ title: f.text({ required: true }) })

    expect(description?.min).toBe(1)
  })
})
