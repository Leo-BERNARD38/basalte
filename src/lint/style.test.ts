import { describe, expect, it } from 'vitest'

import { hardcodedStyle, PANEL } from './style.js'

function css(...declarations: readonly string[]): string {
  return [
    '---',
    'const x = 1',
    '---',
    '',
    '<style>',
    '  .b {',
    ...declarations.map((entry) => `    ${entry}`),
    '  }',
    '</style>',
  ].join('\n')
}

function rules(source: string): readonly string[] {
  return hardcodedStyle('B.astro', source).map((entry) => entry.rule)
}

describe('hardcodedStyle', () => {
  it('refuse une couleur écrite en clair, sous ses trois notations', () => {
    expect(rules(css('background: #ff0044;'))).toEqual(['style/color'])
    expect(rules(css('color: rgb(12, 24, 48);'))).toEqual(['style/color'])
    expect(rules(css('color: white;'))).toEqual(['style/color'])
  })

  it('refuse un espacement, une taille et une police en dur', () => {
    expect(rules(css('padding: 27px;'))).toEqual(['style/space'])
    expect(rules(css('font-size: 18px;'))).toEqual(['style/text'])
    expect(rules(css('font-family: Helvetica, sans-serif;'))).toEqual([
      'style/font',
    ])
    expect(rules(css('max-width: 42rem;'))).toEqual(['style/width'])
  })

  it('accepte ce qui vient d’un token, jusque dans une valeur composée', () => {
    expect(rules(css('gap: var(--space-4);'))).toEqual([])
    expect(rules(css('padding: var(--space-8) var(--space-5) 0;'))).toEqual([])
    expect(rules(css('border: 1px solid var(--color-border);'))).toEqual([])
  })

  it('laisse passer ce qu’aucun token ne porte', () => {
    expect(rules(css('width: 100%;'))).toEqual([])
    expect(rules(css('min-height: 44px;'))).toEqual([])
    expect(rules(css('line-height: 1.1;'))).toEqual([])
    expect(rules(css('aspect-ratio: 16 / 9;'))).toEqual([])
    expect(rules(css('margin: 0;'))).toEqual([])
  })

  it('laisse un point de rupture en dur : aucune media query ne lit un token', () => {
    const source = [
      '<style>',
      '  @media (min-width: 48rem) {',
      '    .b { padding: var(--space-6); }',
      '  }',
      '</style>',
    ].join('\n')

    expect(rules(source)).toEqual([])
  })

  it('ne regarde que la feuille de style', () => {
    const source = [
      '---',
      'const colour = "#ff0044"',
      '---',
      '',
      '<p style="padding: 27px">bonjour</p>',
    ].join('\n')

    expect(rules(source)).toEqual([])
  })

  it('nomme la ligne du fichier, pas celle de l’extrait', () => {
    const found = hardcodedStyle('B.astro', css('padding: 27px;'))

    expect(found[0]?.line).toBe(7)
  })

  it('ne prend pas la définition d’un token pour son emploi', () => {
    expect(rules(css('--space-custom: 27px;'))).toEqual([])
  })
})

describe('hardcodedStyle, sur la feuille du panel', () => {
  function panel(source: string) {
    return hardcodedStyle('panel.css', source, PANEL)
  }

  it('lit la feuille entière, sans balise de style', () => {
    expect(panel('.a {\n  gap: 11px;\n}').map((entry) => entry.rule)).toEqual([
      'style/space',
    ])
  })

  it('nomme le token du panel dans la correction', () => {
    expect(panel('.a {\n  gap: 11px;\n}')[0]?.message).toContain(
      'var(--panel-space-… )',
    )
    expect(panel('.a {\n  color: #fff;\n}')[0]?.message).toContain(
      'var(--panel-color-on-surface)',
    )
  })

  // La police est la seule famille que la feuille du panel ne contrôle pas :
  // un « @font-face » nomme forcément la sienne en clair.
  it('laisse passer la seule famille que le panel ne porte pas', () => {
    expect(panel('.a {\n  font-family: Menlo;\n}')).toEqual([])
  })

  it('contrôle la largeur, que la feuille porte désormais', () => {
    expect(panel('.a {\n  max-width: 42rem;\n}').map((e) => e.rule)).toEqual([
      'style/width',
    ])
  })

  it('ignore une déclaration écrite dans un commentaire', () => {
    const source = '/* gap: 11px, et une phrase ; */\n.a {\n  gap: 11px;\n}'

    expect(panel(source).map((entry) => entry.line)).toEqual([3])
  })

  it('accepte ce qui vient d’un token', () => {
    expect(panel('.a {\n  gap: var(--panel-space-3);\n}')).toEqual([])
  })
})
