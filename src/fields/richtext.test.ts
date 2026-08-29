import { describe, expect, it } from 'vitest'

import { renderRichtext } from './richtext.js'

describe('renderRichtext — mise en forme', () => {
  it('rend un paragraphe par bloc séparé d’une ligne vide', () => {
    expect(renderRichtext('Un.\n\nDeux.')).toBe('<p>Un.</p><p>Deux.</p>')
  })

  it('rend un saut de ligne simple', () => {
    expect(renderRichtext('Un.\nDeux.')).toBe('<p>Un.<br>Deux.</p>')
  })

  it('rend le gras et l’italique', () => {
    expect(renderRichtext('**gras** et *penché* et _aussi_')).toBe(
      '<p><strong>gras</strong> et <em>penché</em> et <em>aussi</em></p>',
    )
  })

  it('rend un lien, et le gras à l’intérieur de son libellé', () => {
    expect(renderRichtext('[**Nous** écrire](/contact)')).toBe(
      '<p><a href="/contact"><strong>Nous</strong> écrire</a></p>',
    )
  })

  it('accepte http, https, mailto, tel, une ancre et un chemin', () => {
    for (const href of [
      'https://exemple.fr',
      'http://exemple.fr',
      'mailto:bonjour@exemple.fr',
      'tel:+33100000000',
      '/contact',
      '#ancre',
    ]) {
      expect(renderRichtext(`[x](${href})`)).toContain(`href="${href}"`)
    }
  })

  it('ne rend rien pour une chaîne vide', () => {
    expect(renderRichtext('')).toBe('')
    expect(renderRichtext('   \n\n  ')).toBe('')
  })
})

describe('renderRichtext — aucun HTML libre (invariant 1)', () => {
  it('échappe une balise', () => {
    expect(renderRichtext('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('échappe une image à gestionnaire d’événement', () => {
    const html = renderRichtext('<img src=x onerror="alert(1)">')

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&quot;')
  })

  it('n’échappe pas deux fois une esperluette', () => {
    expect(renderRichtext('AT&T')).toBe('<p>AT&amp;T</p>')
  })

  it('refuse un lien javascript et n’en garde que le libellé', () => {
    expect(renderRichtext('[clique](javascript:alert(1))')).toBe(
      '<p>[clique](javascript:alert(1))</p>',
    )
  })

  it('refuse un schéma quelle que soit sa casse ou son espacement', () => {
    for (const href of [
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox(1)',
      'contact.html',
    ]) {
      expect(renderRichtext(`[x](${href})`)).not.toContain('<a ')
    }
  })

  it('refuse un schéma reconstruit par entité ou caractère de contrôle', () => {
    const control = (code: number) =>
      `java${String.fromCharCode(code)}script:alert(1)`

    for (const href of [
      '&#106;avascript:alert(1)',
      control(0),
      control(9),
      control(10),
      control(13),
    ]) {
      expect(renderRichtext(`[x](${href})`)).not.toContain('<a ')
    }
  })

  it('refuse une adresse externe déguisée en chemin', () => {
    expect(renderRichtext('[x](//exemple.net)')).not.toContain('<a ')
    expect(renderRichtext('[x](//exemple.net/page)')).not.toContain('<a ')
    expect(renderRichtext('[x](/contact)')).toContain('href="/contact"')
  })

  it('ne laisse pas un guillemet sortir de l’attribut href', () => {
    const html = renderRichtext('[x](/a"onmouseover="alert(1))')

    expect(html).not.toContain('onmouseover="alert(1)"')
    expect(html).not.toMatch(/href="[^"]*"[a-z]/)
  })
})
