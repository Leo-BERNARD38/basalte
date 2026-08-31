import { describe, expect, it } from 'vitest'

import { defineSite } from '../site/define.js'
import { resolveJournal } from './define.js'
import {
  feedLanguage,
  feedPath,
  feedPaths,
  feedXml,
  FEED_LIMIT,
} from './feed.js'
import type { PostEntry } from './page.js'

const journal = resolveJournal({ base: 'actualites', label: 'Actualités' })!

const mono = defineSite({
  name: 'Atelier',
  domain: 'exemple.fr',
  languages: { fr: { default: true } },
  journal: { base: 'actualites' },
})

const bilingual = defineSite({
  name: 'Atelier',
  domain: 'exemple.fr',
  languages: { fr: { default: true }, en: {} },
  journal: { base: 'actualites' },
})

function entry(overrides: Partial<PostEntry> = {}): PostEntry {
  return {
    slug: 'ouverture',
    route: '/actualites/ouverture',
    date: '2026-08-28',
    title: 'L’atelier ouvre',
    excerpt: 'Six mois de travaux.',
    cover: '',
    ...overrides,
  }
}

describe('feedPath', () => {
  it('donne le nom nu à la langue par défaut', () => {
    expect(feedPath(journal, 'fr', mono.languages)).toBe('/actualites.xml')
  })

  it('porte le code des autres langues', () => {
    expect(feedPath(journal, 'en', bilingual.languages)).toBe(
      '/actualites.en.xml',
    )
  })

  it('rend une adresse par langue en ligne', () => {
    expect(feedPaths(journal, bilingual.languages)).toEqual([
      '/actualites.xml',
      '/actualites.en.xml',
    ])
  })
})

describe('feedLanguage', () => {
  it('retrouve la langue derrière l’adresse demandée', () => {
    expect(
      feedLanguage(journal, '/actualites.en.xml', bilingual.languages),
    ).toBe('en')
    expect(feedLanguage(journal, '/actualites.xml', bilingual.languages)).toBe(
      'fr',
    )
  })

  it('rend undefined pour une adresse qui n’est celle d’aucune langue', () => {
    expect(
      feedLanguage(journal, '/actualites.de.xml', bilingual.languages),
    ).toBeUndefined()
  })
})

describe('feedXml', () => {
  it('nomme le flux, son index et lui-même', () => {
    const xml = feedXml({ site: mono, journal, language: 'fr', posts: [] })

    expect(xml).toContain('<title>Actualités — Atelier</title>')
    expect(xml).toContain('<link>https://exemple.fr/actualites</link>')
    expect(xml).toContain('href="https://exemple.fr/actualites.xml"')
  })

  it('porte un élément par billet, avec une date lisible par un agrégateur', () => {
    const xml = feedXml({
      site: mono,
      journal,
      language: 'fr',
      posts: [entry()],
    })

    expect(xml).toContain(
      '<link>https://exemple.fr/actualites/ouverture</link>',
    )
    expect(xml).toContain('<pubDate>Fri, 28 Aug 2026 00:00:00 GMT</pubDate>')
  })

  it('préfixe les adresses d’une langue qui n’est pas celle par défaut', () => {
    const xml = feedXml({
      site: bilingual,
      journal,
      language: 'en',
      posts: [entry()],
    })

    expect(xml).toContain(
      '<link>https://exemple.fr/en/actualites/ouverture</link>',
    )
  })

  it('échappe ce que le client écrit : aucune balise ne vient du texte', () => {
    const xml = feedXml({
      site: mono,
      journal,
      language: 'fr',
      posts: [entry({ title: '<script>alert(1)</script> & co' })],
    })

    expect(xml).not.toContain('<script>')
    expect(xml).toContain('&amp; co')
  })

  it('s’arrête au nombre de billets qu’un lecteur remonte', () => {
    const many = Array.from({ length: FEED_LIMIT + 5 }, (_, index) =>
      entry({ slug: `billet-${index}`, route: `/actualites/billet-${index}` }),
    )

    const xml = feedXml({ site: mono, journal, language: 'fr', posts: many })

    expect([...xml.matchAll(/<item>/g)]).toHaveLength(FEED_LIMIT)
  })

  it('omet la description d’un billet qui n’en porte pas', () => {
    const xml = feedXml({
      site: mono,
      journal,
      language: 'fr',
      posts: [entry({ excerpt: '  ' })],
    })

    expect(xml).not.toContain('<description>  </description>')
  })
})
