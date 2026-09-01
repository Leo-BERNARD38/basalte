import { describe, expect, it } from 'vitest'

import { listBounds } from './bounds.js'

function lines(source: string): readonly number[] {
  return listBounds('schema.ts', source).map((entry) => entry.line)
}

const LIST = [
  'export default block({',
  "  name: 'faq',",
  '  fields: {',
  '    items: f.list({',
  "      label: 'Questions',",
  '      required: true,',
  '      min: 1,',
  '      max: 12,',
  '      of: {',
  "        question: f.text({ label: 'Question', max: 120 }),",
  '      },',
  '    }),',
  '  },',
  '})',
].join('\n')

describe('listBounds', () => {
  it('signale une borne haute que rien ne justifie', () => {
    expect(lines(LIST)).toEqual([8])
  })

  it('laisse passer une borne que le commentaire du dessus justifie', () => {
    expect(
      lines(
        LIST.replace(
          '      max: 12,',
          '      // Une rangée sans repli.\n      max: 12,',
        ),
      ),
    ).toEqual([])
  })

  it('ne dit rien d’une borne de texte hors d’une liste', () => {
    expect(
      lines(
        [
          '  fields: {',
          "    title: f.text({ label: 'Titre', max: 80 }),",
          '  },',
        ].join('\n'),
      ),
    ).toEqual([])
  })

  it('ne se laisse pas ouvrir par une parenthèse citée dans un libellé', () => {
    expect(
      lines(
        [
          "    title: f.text({ label: 'Titre (court', max: 80 }),",
          "    intro: f.textarea({ label: 'Intro', max: 300 }),",
          '  },',
        ].join('\n'),
      ),
    ).toEqual([])
  })

  it('retrouve le hors-liste après la fin de la liste', () => {
    expect(
      lines(
        [
          ...LIST.split('\n').slice(0, 12),
          "    title: f.text({ label: 'Titre', max: 80 }),",
          '  },',
          '})',
        ].join('\n'),
      ),
    ).toEqual([8])
  })

  it('avertit sans jamais refuser', () => {
    expect(
      listBounds('schema.ts', LIST).map((entry) => entry.severity),
    ).toEqual(['warning'])
  })
})
