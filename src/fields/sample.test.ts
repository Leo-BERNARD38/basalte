import { describe, expect, it } from 'vitest'

import { f } from './define.js'
import { sampleValues } from './sample.js'

const languages = ['fr', 'en']

describe('sampleValues', () => {
  it('remplit un texte dans chaque langue déclarée', () => {
    const values = sampleValues(
      { title: f.text({ label: 'Titre de la section', i18n: true }) },
      { languages },
    )

    expect(values['title']).toEqual({
      fr: 'Titre de la section',
      en: 'Titre de la section',
    })
  })

  it('laisse un champ non traduisible en chaîne nue', () => {
    const values = sampleValues(
      { href: f.url({ label: 'Lien' }) },
      { languages },
    )

    expect(values['href']).toBe('#')
  })

  it('emploie la grammaire que le champ déclare, et pas plus', () => {
    const rich = sampleValues(
      { body: f.richtext({ label: 'Texte', headings: true, lists: true }) },
      { languages },
    )
    const plain = sampleValues(
      { body: f.richtext({ label: 'Texte' }) },
      { languages },
    )

    expect(rich['body']).toContain('## ')
    expect(rich['body']).toContain('- ')
    expect(plain['body']).not.toContain('## ')
  })

  it('prend la première option d’une liste déroulante', () => {
    const values = sampleValues(
      {
        align: f.select({
          label: 'Alignement',
          options: [
            { value: 'left', label: 'Gauche' },
            { value: 'right', label: 'Droite' },
          ],
        }),
      },
      { languages },
    )

    expect(values['align']).toBe('left')
  })

  it('emploie les clés fournies pour une image et un document, sinon rien', () => {
    const fields = { photo: f.image({ label: 'Photo' }), file: f.document({}) }

    expect(sampleValues(fields, { languages })).toEqual({ photo: '', file: '' })
    expect(
      sampleValues(fields, { languages, image: 'abc', document: 'def' }),
    ).toEqual({ photo: 'abc', file: 'def' })
  })

  it('descend dans un groupe', () => {
    const values = sampleValues(
      {
        cta: f.group({
          label: 'Bouton',
          fields: { label: f.text({ label: 'Libellé', i18n: true }) },
        }),
      },
      { languages: ['fr'] },
    )

    expect(values['cta']).toEqual({ label: { fr: 'Libellé' } })
  })

  it('remplit une liste sans sortir de ses bornes', () => {
    const item = { caption: f.text({ label: 'Légende' }) }

    expect(
      sampleValues(
        { images: f.list({ label: 'Images', of: item }) },
        { languages },
      ),
    ).toEqual({
      images: [
        { caption: 'Légende' },
        { caption: 'Légende' },
        { caption: 'Légende' },
      ],
    })

    expect(
      sampleValues(
        { images: f.list({ label: 'Images', of: item, max: 1 }) },
        { languages },
      ),
    ).toEqual({ images: [{ caption: 'Légende' }] })

    expect(
      sampleValues(
        { images: f.list({ label: 'Images', of: item, min: 4 }) },
        { languages },
      ),
    ).toEqual({
      images: Array.from({ length: 4 }, () => ({ caption: 'Légende' })),
    })
  })

  it('respecte la borne haute d’un texte', () => {
    const values = sampleValues(
      {
        code: f.text({ label: 'Un libellé bien trop long pour tenir', max: 8 }),
      },
      { languages: ['fr'] },
    )

    expect(String(values['code'])).toHaveLength(8)
  })
})
