// Les liens du chrome : ceux qu’un client a rangés, ou les pages du site quand
// il n’a rien rangé.

import { describe, expect, it } from 'vitest'

import { THANKS_PAGE } from '../content/naming.js'
import type { PageEntry } from './define.js'
import { navigationLinks, type LinkValue } from './links.js'

const PAGES: readonly PageEntry[] = [
  { name: 'confidentialite', route: '/confidentialite' },
  { name: 'contact', route: '/contact' },
  { name: 'index', route: '/' },
]

function link(label: Record<string, string>, href: string): LinkValue {
  return { label, href }
}

function navigate(
  links: readonly LinkValue[],
  overrides: Partial<Parameters<typeof navigationLinks>[0]> = {},
) {
  return navigationLinks({
    links,
    pages: PAGES,
    language: 'fr',
    prefix: '',
    route: '/',
    whenEmpty: 'pages',
    ...overrides,
  })
}

describe('navigationLinks', () => {
  it('reprend les pages du site quand la liste est vide, l’accueil en tête', () => {
    expect(navigate([]).map((entry) => entry.href)).toEqual([
      '/',
      '/confidentialite',
      '/contact',
    ])
    expect(navigate([])[0]?.label).toBe('Accueil')
    expect(navigate([])[1]?.label).toBe('Confidentialite')
  })

  it('ne devine rien quand le repli est refusé', () => {
    expect(navigate([], { whenEmpty: 'nothing' })).toEqual([])
  })

  it('n’emploie que la liste rangée dès qu’elle porte un lien', () => {
    const links = [link({ fr: 'Nous écrire' }, '/contact')]

    expect(navigate(links).map((entry) => entry.label)).toEqual(['Nous écrire'])
  })

  // Une langue qu’on n’a pas encore traduite ne doit pas laisser un lien nu.
  it('écarte un lien dont le libellé manque dans la langue rendue', () => {
    const links = [
      link({ fr: 'Accueil', en: '' }, '/'),
      link({ fr: 'Nous écrire', en: 'Contact us' }, '/contact'),
    ]

    expect(
      navigate(links, { language: 'en' }).map((entry) => entry.href),
    ).toEqual(['/contact'])
  })

  // Le schéma exige la destination, si bien que le cas ne survient qu’en
  // aperçu d’un brouillon en cours : le menu retombe alors sur les pages,
  // plutôt que de disparaître.
  it('écarte un lien sans destination', () => {
    expect(
      navigate([link({ fr: 'Nulle part' }, '  ')], { whenEmpty: 'nothing' }),
    ).toEqual([])
    expect(navigate([link({ fr: 'Nulle part' }, '  ')])).toHaveLength(
      PAGES.length,
    )
  })

  // Le lien est écrit « /contact » et vaut « /en/contact » sur la page
  // anglaise : c’est `urlFor` qui décide, comme pour `getStaticPaths`.
  it('préfixe un lien interne de la langue rendue', () => {
    const links = [link({ en: 'Contact' }, '/contact')]

    expect(navigate(links, { language: 'en', prefix: 'en' })[0]?.href).toBe(
      '/en/contact',
    )
  })

  it('laisse une adresse externe telle quelle', () => {
    const links = [link({ fr: 'Ailleurs' }, 'https://exemple.fr')]

    expect(navigate(links, { prefix: 'en' })[0]?.href).toBe(
      'https://exemple.fr',
    )
  })

  it('marque la page où le visiteur se trouve, et elle seule', () => {
    const links = [
      link({ fr: 'Accueil' }, '/'),
      link({ fr: 'Nous écrire' }, '/contact'),
    ]

    expect(
      navigate(links, { route: '/contact' }).map((e) => e.current),
    ).toEqual([false, true])
  })
})

// Une page de service existe pour un visiteur qui vient d’agir : l’envoyer
// remercier avant d’avoir écrit n’aurait aucun sens.
describe('les pages de service', () => {
  it('ne se déduisent jamais dans le menu', () => {
    const withThanks = [
      ...PAGES,
      { name: THANKS_PAGE, route: `/${THANKS_PAGE}` },
    ]

    expect(
      navigate([], { pages: withThanks }).map((entry) => entry.href),
    ).toEqual(['/', '/confidentialite', '/contact'])
  })

  // Le client range son menu comme il veut : ce qu’il y écrit, il l’a voulu.
  it('restent possibles quand le client les range lui-même', () => {
    const withThanks = [
      ...PAGES,
      { name: THANKS_PAGE, route: `/${THANKS_PAGE}` },
    ]

    expect(
      navigate([link({ fr: 'Merci' }, `/${THANKS_PAGE}`)], {
        pages: withThanks,
      }).map((entry) => entry.href),
    ).toEqual([`/${THANKS_PAGE}`])
  })
})
