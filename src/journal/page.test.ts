import { describe, expect, it } from 'vitest'

import { resolveLanguages } from '../site/languages.js'
import { resolveJournal, type Post } from './define.js'
import { allPages, byDate, pageOfPost, postEntries, postPages } from './page.js'
import { validatePost } from './read.js'
import { visibleIn } from '../seo/sitemap.js'
import { defineSite } from '../site/define.js'

const journal = resolveJournal({ base: 'actualites', label: 'Actualités' })!

function post(overrides: Partial<Post> = {}): Post {
  return {
    $format: 1,
    slug: 'ouverture',
    hidden: {},
    fields: {
      title: { fr: 'L’atelier ouvre', en: 'The workshop opens' },
      date: '2026-08-28',
      excerpt: { fr: 'Six mois de travaux.', en: 'Six months of work.' },
      cover: 'abcdef0123456789',
      body: { fr: 'Le texte.', en: 'The text.' },
      gallery: [],
    },
    ...overrides,
  }
}

describe('pageOfPost', () => {
  it('fait du titre et du résumé le titre et la description de la page', () => {
    const page = pageOfPost(post())

    expect(page.meta.title).toEqual({
      fr: 'L’atelier ouvre',
      en: 'The workshop opens',
    })
    expect(page.meta.description['fr']).toBe('Six mois de travaux.')
  })

  it('laisse l’image de partage vide : la carte retombe sur la couverture', () => {
    expect(pageOfPost(post()).meta.image).toBe('')
  })

  it('rend une page d’une seule section, qui porte les champs du billet', () => {
    const page = pageOfPost(post())

    expect(page.blocks).toHaveLength(1)
    expect(page.blocks[0]?.type).toBe('post')
    expect(page.blocks[0]?.props).toEqual(post().fields)
  })

  it('reporte le masquage du billet sur sa section, ce qui le sort du sitemap', () => {
    const page = pageOfPost(post({ hidden: { fr: true } }))

    expect(visibleIn(page, 'fr')).toBe(false)
    expect(visibleIn(page, 'en')).toBe(true)
  })
})

describe('postPages', () => {
  it('donne au billet une adresse sous le segment du journal', () => {
    const [entry] = postPages(journal, [post()])

    expect(entry?.route).toBe('/actualites/ouverture')
    expect(entry?.name).toBe('actualites/ouverture')
  })
})

describe('postEntries', () => {
  it('écarte un billet masqué dans la langue demandée', () => {
    const entries = postEntries(
      journal,
      [post({ hidden: { fr: true } }), post({ slug: 'autre' })],
      'fr',
    )

    expect(entries.map((entry) => entry.slug)).toEqual(['autre'])
  })

  it('rend le texte de la langue, jamais la carte entière', () => {
    const [entry] = postEntries(journal, [post()], 'en')

    expect(entry?.title).toBe('The workshop opens')
    expect(entry?.excerpt).toBe('Six months of work.')
  })
})

describe('byDate', () => {
  it('range du plus récent au plus ancien', () => {
    const posts = [
      post({ slug: 'vieux', fields: { ...post().fields, date: '2020-01-01' } }),
      post({ slug: 'neuf', fields: { ...post().fields, date: '2026-12-31' } }),
    ]

    expect([...posts].sort(byDate).map((entry) => entry.slug)).toEqual([
      'neuf',
      'vieux',
    ])
  })

  it('départage deux billets du même jour par leur slug', () => {
    const same = { ...post().fields, date: '2026-08-28' }
    const posts = [
      post({ slug: 'b', fields: same }),
      post({ slug: 'a', fields: same }),
    ]

    expect([...posts].sort(byDate).map((entry) => entry.slug)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('allPages', () => {
  const site = defineSite({
    name: 'Atelier',
    domain: 'exemple.fr',
    languages: { fr: { default: true } },
    journal: { base: 'actualites' },
  })

  it('concatène les pages et les billets compilés', () => {
    const pages = allPages({
      site,
      pages: [
        {
          name: 'index',
          route: '/',
          page: { $format: 1, meta: {} as never, blocks: [] },
        },
      ],
      posts: [post()],
    })

    expect(pages.map((entry) => entry.route)).toEqual([
      '/',
      '/actualites/ouverture',
    ])
  })

  it('rend les seules pages quand le site n’a pas de journal', () => {
    const plain = defineSite({
      name: 'Atelier',
      domain: 'exemple.fr',
      languages: { fr: { default: true } },
    })

    expect(allPages({ site: plain, pages: [], posts: [post()] })).toHaveLength(
      0,
    )
  })
})

describe('resolveJournal', () => {
  it('donne un segment et un nom par défaut', () => {
    expect(resolveJournal({})).toEqual({
      base: 'actualites',
      label: 'Actualités',
    })
  })

  it('refuse un segment qui ne peut pas être une adresse', () => {
    expect(() => resolveJournal({ base: 'Nos Actualités' })).toThrow(
      /segment d’adresse/,
    )
  })

  it('refuse un nom vide : c’est ce que le client lit', () => {
    expect(() => resolveJournal({ label: '  ' })).toThrow(/nom/)
  })

  it('rend undefined pour un site qui n’en déclare pas', () => {
    expect(resolveJournal(undefined)).toBeUndefined()
  })
})

describe('les langues d’un billet', () => {
  const languages = resolveLanguages({ fr: { default: true }, en: {} })

  it('un billet masqué partout n’a d’adresse dans aucune langue', () => {
    const page = pageOfPost(post({ hidden: { fr: true, en: true } }))

    expect(
      languages.online.filter((language) => visibleIn(page, language.code)),
    ).toHaveLength(0)
  })
})

describe('un billet en brouillon', () => {
  it('s’enregistre incomplet, et ses bornes reviennent quand il paraît', () => {
    const languages = resolveLanguages({ fr: { default: true } })
    const bare = {
      $format: 1,
      hidden: { fr: true },
      fields: { title: { fr: 'Ébauche' } },
    }

    const drafted = validatePost({
      journal,
      slug: 'ebauche',
      source: bare,
      languages,
      media: {},
      documents: {},
    })

    expect(drafted.post).toBeDefined()

    const shown = validatePost({
      journal,
      slug: 'ebauche',
      source: { ...bare, hidden: { fr: false } },
      languages,
      media: {},
      documents: {},
    })

    expect(shown.post).toBeUndefined()
    expect(shown.issues.some((issue) => issue.severity === 'error')).toBe(true)
  })
})
