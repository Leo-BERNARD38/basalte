import { describe, expect, it } from 'vitest'

import { manualValidation } from './validation.js'

function messages(source: string): readonly string[] {
  return manualValidation('schema.ts', source).map((entry) => entry.message)
}

describe('manualValidation', () => {
  it('refuse un raffinement, une levée et l’import de Zod', () => {
    expect(
      messages('titre: f.text().refine((v) => v.length > 3),'),
    ).toHaveLength(1)
    expect(messages('  throw new Error("non")')).toHaveLength(1)
    expect(messages("import { z } from 'zod'")).toHaveLength(1)
  })

  it('laisse un schéma qui ne valide que par le DSL', () => {
    const source = [
      "import { block, f } from '@leobernard/basalte'",
      '',
      'export default block({',
      "  name: 'hero',",
      "  label: 'Bandeau',",
      '  fields: {',
      "    titre: f.text({ label: 'Titre', required: true, max: 60 }),",
      '  },',
      '})',
    ].join('\n')

    expect(messages(source)).toEqual([])
  })

  it('ne lit pas une règle citée dans un commentaire', () => {
    expect(
      messages('// jamais de .refine() ici : la contrainte va dans f.*'),
    ).toEqual([])
  })
})
