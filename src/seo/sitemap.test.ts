import { describe, expect, it } from 'vitest'

import { THANKS_PAGE } from '../content/naming.js'
import type { Page } from '../content/page.js'
import { defineSite, type Site } from '../site/define.js'
import {
  robotsTxt,
  sitemapXml,
  visibleIn,
  type SitemapPage,
} from './sitemap.js'

const mono: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true } },
})

const bilingual: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true }, en: {} },
})

const drafted: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true }, en: { draft: true } },
})

function page(hidden: Readonly<Record<string, boolean>> = {}): Page {
  return {
    $format: 1,
    meta: { title: {}, description: {}, image: '' },
    blocks: [{ id: 'a', type: 'hero', hidden, props: {} }],
  }
}

const pages: readonly SitemapPage[] = [
  { route: '/', page: page() },
  { route: '/contact', page: page() },
]

describe('visibleIn', () => {
  it('dit non quand toutes les sections sont masquées dans la langue', () => {
    expect(visibleIn(page({ en: true }), 'en')).toBe(false)
    expect(visibleIn(page({ en: true }), 'fr')).toBe(true)
  })

  it('dit non d’une page sans section : elle s’afficherait vide', () => {
    expect(visibleIn({ ...page(), blocks: [] }, 'fr')).toBe(false)
  })
})

describe('sitemapXml', () => {
  it('liste les adresses absolues, sans alternate sur un site monolingue', () => {
    const xml = sitemapXml(mono, pages)

    expect(xml).toContain('<loc>https://atelier-duvallon.fr/</loc>')
    expect(xml).toContain('<loc>https://atelier-duvallon.fr/contact</loc>')
    expect(xml).not.toContain('xhtml:link')
  })

  it('donne à chaque langue en ligne son adresse et ses alternates', () => {
    const xml = sitemapXml(bilingual, pages)

    expect(xml).toContain('<loc>https://atelier-duvallon.fr/en/contact</loc>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://atelier-duvallon.fr/en/contact" />',
    )
  })

  it('écarte une langue en préparation : elle n’est pas construite', () => {
    expect(sitemapXml(drafted, pages)).not.toContain('/en/')
  })

  it('écarte une page masquée dans une langue', () => {
    const xml = sitemapXml(bilingual, [
      { route: '/contact', page: page({ en: true }) },
    ])

    expect(xml).toContain('<loc>https://atelier-duvallon.fr/contact</loc>')
    expect(xml).not.toContain('/en/contact')
    expect(xml).not.toContain('xhtml:link')
  })

  it('ne porte jamais le préfixe du rendu bureau', () => {
    expect(sitemapXml(mono, pages)).not.toContain('_desktop')
  })
})

describe('robotsTxt', () => {
  it('écarte le panel et nomme le sitemap', () => {
    const written = robotsTxt(mono)

    expect(written).toContain('Disallow: /admin')
    expect(written).toContain('Disallow: /api/')
    expect(written).toContain(
      'Sitemap: https://atelier-duvallon.fr/sitemap.xml',
    )
  })
})

// Un moteur qui indexerait la page de remerciement y enverrait des visiteurs
// qui n’ont rien envoyé.
describe('les pages de service', () => {
  it('ne figurent pas au sitemap', () => {
    const written = sitemapXml(mono, [
      ...pages,
      { route: `/${THANKS_PAGE}`, page: page() },
    ])

    expect(written).not.toContain(THANKS_PAGE)
    expect(written).toContain('/contact')
  })
})
