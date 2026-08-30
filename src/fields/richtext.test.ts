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

  it('laisse en texte un lien qui sort du site sous les dehors d’un chemin', () => {
    for (const href of ['//exemple.fr', '/\\exemple.fr', '/\\/exemple.fr']) {
      const rendered = renderRichtext(`[Nous écrire](${href})`)

      expect(rendered).not.toContain('<a')
      expect(rendered).toContain('Nous écrire')
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

describe('renderRichtext — grammaire par défaut', () => {
  it('laisse un dièse et un tiret en texte', () => {
    expect(renderRichtext('## Titre')).toBe('<p>## Titre</p>')
    expect(renderRichtext('- un\n- deux')).toBe('<p>- un<br>- deux</p>')
    expect(renderRichtext('1. un')).toBe('<p>1. un</p>')
  })
})

describe('renderRichtext — titres', () => {
  const grammar = { headings: true }

  it('rend deux et trois dièses en titres de second et troisième rang', () => {
    expect(renderRichtext('## Deux\n\n### Trois', grammar)).toBe(
      '<h2>Deux</h2><h3>Trois</h3>',
    )
  })

  it('laisse un dièse seul en texte : le premier titre est celui de la page', () => {
    expect(renderRichtext('# Titre', grammar)).toBe('<p># Titre</p>')
    expect(renderRichtext('#### Titre', grammar)).toBe('<p>#### Titre</p>')
  })

  it('ouvre un paragraphe après un titre sans ligne vide', () => {
    expect(renderRichtext('## Titre\nUn texte.', grammar)).toBe(
      '<h2>Titre</h2><p>Un texte.</p>',
    )
  })

  it('rend le gras et les liens dans un titre', () => {
    expect(renderRichtext('## **Fort** et [lié](/a)', grammar)).toBe(
      '<h2><strong>Fort</strong> et <a href="/a">lié</a></h2>',
    )
  })

  it('échappe une balise dans un titre', () => {
    expect(renderRichtext('## <script>alert(1)</script>', grammar)).toBe(
      '<h2>&lt;script&gt;alert(1)&lt;/script&gt;</h2>',
    )
  })
})

describe('renderRichtext — listes', () => {
  const grammar = { lists: true }

  it('rend une liste à puces, tiret ou étoile', () => {
    expect(renderRichtext('- un\n* deux', grammar)).toBe(
      '<ul><li>un</li><li>deux</li></ul>',
    )
  })

  it('rend une liste numérotée', () => {
    expect(renderRichtext('1. un\n2. deux', grammar)).toBe(
      '<ol><li>un</li><li>deux</li></ol>',
    )
  })

  it('sépare une liste à puces d’une liste numérotée qui la suit', () => {
    expect(renderRichtext('- un\n1. deux', grammar)).toBe(
      '<ul><li>un</li></ul><ol><li>deux</li></ol>',
    )
  })

  it('reprend un paragraphe après la liste', () => {
    expect(renderRichtext('- un\n\nDeux.', grammar)).toBe(
      '<ul><li>un</li></ul><p>Deux.</p>',
    )
  })

  it('rend le gras et les liens dans un élément', () => {
    expect(renderRichtext('- **un** [deux](/a)', grammar)).toBe(
      '<ul><li><strong>un</strong> <a href="/a">deux</a></li></ul>',
    )
  })

  it('échappe une balise dans un élément', () => {
    expect(
      renderRichtext('- <img src=x onerror="alert(1)">', grammar),
    ).toContain('&lt;img')
    expect(renderRichtext('- <img src=x>', grammar)).not.toContain('<img')
  })
})
