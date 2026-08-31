import { describe, expect, it } from 'vitest'

import { defineSite, type Site } from '../site/define.js'
import type { BusinessFacts } from './business.js'
import {
  businessNode,
  pageNodes,
  renderStructured,
  websiteNode,
} from './structured.js'

const site: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true } },
})

const EMPTY: BusinessFacts = {
  legalName: '',
  kind: '',
  address: { street: '', postalCode: '', city: '', country: '' },
  phone: '',
  email: '',
  area: '',
  hours: [],
}

const FULL: BusinessFacts = {
  legalName: 'Atelier Duvallon SARL',
  kind: 'HomeAndConstructionBusiness',
  address: {
    street: '12 rue des Copeaux',
    postalCode: '38000',
    city: 'Grenoble',
    country: 'France',
  },
  phone: '+33 4 76 00 00 00',
  email: 'bonjour@exemple.fr',
  area: 'Grenoble',
  hours: [{ day: 'Monday', opens: '09:00', closes: '18:00' }],
}

describe('businessNode', () => {
  it('ne rend rien d’une fiche sans raison sociale', () => {
    expect(businessNode(site, EMPTY)).toBeUndefined()
  })

  it('rend un commerce local quand l’adresse est complète', () => {
    const node = businessNode(site, FULL)

    expect(node?.['@type']).toBe('HomeAndConstructionBusiness')
    expect(node?.['@id']).toBe('https://atelier-duvallon.fr/#entreprise')
    expect(node?.['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '12 rue des Copeaux',
      postalCode: '38000',
      addressLocality: 'Grenoble',
      addressCountry: 'France',
    })
    expect(node?.['openingHoursSpecification']).toHaveLength(1)
  })

  it('retombe sur une organisation quand l’adresse est incomplète', () => {
    const node = businessNode(site, {
      ...FULL,
      address: { ...FULL.address, city: '' },
    })

    expect(node?.['@type']).toBe('Organization')
    expect(node?.['address']).toBeUndefined()
  })

  it('écarte un horaire dont il manque une borne', () => {
    const node = businessNode(site, {
      ...FULL,
      hours: [
        { day: 'Monday', opens: '09:00', closes: '' },
        { day: 'Tuesday', opens: '09:00', closes: '18:00' },
      ],
    })

    expect(node?.['openingHoursSpecification']).toHaveLength(1)
  })

  it('n’écrit pas une clé vide plutôt que de l’omettre', () => {
    const node = businessNode(site, { ...FULL, phone: '', email: '', area: '' })

    expect(node).not.toHaveProperty('telephone')
    expect(node).not.toHaveProperty('email')
    expect(node).not.toHaveProperty('areaServed')
  })
})

describe('pageNodes', () => {
  const sections = [
    { id: 'q1', type: 'faq', hidden: {}, props: { items: [] } },
    { id: 'h1', type: 'hero', hidden: {}, props: {} },
  ]

  const builders = {
    faq: () => ({ '@type': 'FAQPage' }),
  }

  it('ne pose le site que sur l’accueil', () => {
    const home = pageNodes({
      site,
      business: EMPTY,
      builders: {},
      sections: [],
      route: '/',
      language: 'fr',
      url: 'https://atelier-duvallon.fr/',
    })

    const other = pageNodes({
      site,
      business: EMPTY,
      builders: {},
      sections: [],
      route: '/contact',
      language: 'fr',
      url: 'https://atelier-duvallon.fr/contact',
    })

    expect(home).toEqual([websiteNode(site, 'https://atelier-duvallon.fr/')])
    expect(other).toEqual([])
  })

  it('reprend ce que déclarent les sections, et ignore celles qui ne déclarent rien', () => {
    const nodes = pageNodes({
      site,
      business: EMPTY,
      builders,
      sections,
      route: '/aide',
      language: 'fr',
      url: 'https://atelier-duvallon.fr/aide',
    })

    expect(nodes).toEqual([{ '@type': 'FAQPage' }])
  })
})

describe('renderStructured', () => {
  it('échappe ce qui refermerait la balise', () => {
    const written = renderStructured({ name: '</script><img onerror=x>' })

    expect(written).not.toContain('</script>')
    expect(written).not.toContain('<img')
    expect(JSON.parse(written)).toEqual({ name: '</script><img onerror=x>' })
  })
})
