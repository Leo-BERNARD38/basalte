import { describe, expect, it } from 'vitest'

import { block } from '../blocks/define.js'
import type { Page } from '../content/page.js'
import { renderIssue } from '../content/report.js'
import { f } from '../fields/define.js'
import { resolveLanguages } from '../site/languages.js'
import type { BusinessFacts } from './business.js'
import { findableIssues, type FindablePage } from './findable.js'

const hero = block({
  name: 'hero',
  label: 'Bandeau',
  fields: {
    title: f.text({ label: 'Titre', i18n: true }),
    image: f.image({ label: 'Image' }),
  },
})

const registry = { hero }
const mono = resolveLanguages({ fr: { default: true } })
const withDraft = resolveLanguages({
  fr: { default: true },
  en: { draft: true },
})
const bilingual = resolveLanguages({ fr: { default: true }, en: {} })

const facts: BusinessFacts = {
  legalName: 'Atelier SARL',
  kind: 'Organization',
  address: {
    street: '12 rue des Copeaux',
    postalCode: '38000',
    city: 'Grenoble',
    country: 'France',
  },
  phone: '',
  email: '',
  area: '',
  hours: [],
}

function page(input: {
  readonly name: string
  readonly route?: string
  readonly title?: Record<string, string>
  readonly description?: Record<string, string>
  readonly image?: string
  readonly section?: string
  readonly hidden?: Record<string, boolean>
}): FindablePage {
  const built: Page = {
    $format: 1,
    meta: {
      title: input.title ?? { fr: `Titre de ${input.name}` },
      description: input.description ?? { fr: `Description de ${input.name}` },
      image: input.image ?? '',
    },
    blocks: [
      {
        id: 's1',
        type: 'hero',
        hidden: input.hidden ?? {},
        props: { title: { fr: 'Un titre' }, image: input.section ?? '' },
      },
    ],
  }

  return {
    name: input.name,
    route: input.route ?? `/${input.name}`,
    page: built,
  }
}

function issuesOf(pages: readonly FindablePage[], business = facts) {
  return findableIssues({
    pages,
    registry,
    languages: mono,
    business,
  }).map(renderIssue)
}

describe('findableIssues — doublons', () => {
  it('nomme l’autre page quand deux titres sont identiques', () => {
    const found = issuesOf([
      page({ name: 'index', title: { fr: 'Atelier' }, image: 'aaa' }),
      page({ name: 'contact', title: { fr: 'Atelier' }, image: 'aaa' }),
    ])

    expect(found).toContain(
      'contact › Titre de la page (français) : ce titre est déjà celui de « index » : les moteurs n’afficheront qu’une des deux pages',
    )
  })

  it('signale aussi une description reprise d’une page à l’autre', () => {
    const found = issuesOf([
      page({ name: 'index', description: { fr: 'La même.' }, image: 'aaa' }),
      page({ name: 'contact', description: { fr: 'La même.' }, image: 'aaa' }),
    ])

    expect(found).toContain(
      'contact › Description (français) : cette description est déjà celle de « index »',
    )
  })

  it('ne compare pas une langue en préparation, qui n’est pas construite', () => {
    const found = findableIssues({
      pages: [
        page({
          name: 'index',
          title: { fr: 'Accueil', en: 'Same' },
          image: 'aaa',
        }),
        page({
          name: 'contact',
          title: { fr: 'Contact', en: 'Same' },
          image: 'aaa',
        }),
      ],
      registry,
      languages: withDraft,
      business: facts,
    })

    expect(found).toEqual([])
  })

  it('laisse passer deux titres vides, qui sont un manque et non un doublon', () => {
    const found = issuesOf([
      page({ name: 'index', title: { fr: '' }, image: 'aaa' }),
      page({ name: 'contact', title: { fr: '' }, image: 'aaa' }),
    ])

    expect(found.filter((message) => message.includes('déjà'))).toEqual([])
  })
})

describe('findableIssues — vignette de partage', () => {
  it('signale une page sans image choisie ni image dans ses sections', () => {
    expect(issuesOf([page({ name: 'contact' })])).toEqual([
      'contact : le lien de cette page se partage sans vignette : aucune image de partage, et aucune image dans ses sections',
    ])
  })

  it('se contente d’une image portée par une section, sur laquelle la carte retombe', () => {
    expect(issuesOf([page({ name: 'index', section: 'aaa' })])).toEqual([])
  })

  it('ne compte pas l’image d’une section masquée, absente de la page construite', () => {
    expect(
      issuesOf([page({ name: 'index', section: 'aaa', hidden: { fr: true } })]),
    ).toEqual([
      'index : le lien de cette page se partage sans vignette : aucune image de partage, et aucune image dans ses sections',
    ])
  })

  it('regarde chaque langue en ligne, et nomme celle qui manque', () => {
    const found = findableIssues({
      pages: [page({ name: 'index', section: 'aaa', hidden: { en: true } })],
      registry,
      languages: bilingual,
      business: facts,
    }).map(renderIssue)

    expect(found).toEqual([
      'index : le lien de cette page se partage sans vignette en anglais : aucune image de partage, et aucune image dans ses sections',
    ])
  })

  it('exempte une page de service, que personne ne partage', () => {
    expect(issuesOf([page({ name: 'merci', route: '/merci' })])).toEqual([])
  })
})

describe('findableIssues — fiche d’entreprise', () => {
  it('signale une fiche sans raison sociale', () => {
    const empty = { ...facts, legalName: '' }

    expect(issuesOf([page({ name: 'index', image: 'aaa' })], empty)).toEqual([
      'fiche : aucune raison sociale : le site n’émet aucune donnée structurée d’entreprise',
    ])
  })

  it('signale une adresse incomplète, qui fait retomber le type déclaré', () => {
    const partial = { ...facts, address: { ...facts.address, street: '' } }

    expect(issuesOf([page({ name: 'index', image: 'aaa' })], partial)).toEqual([
      'fiche : l’adresse est incomplète : le type déclaré est ignoré, et la fiche retombe sur « Organization »',
    ])
  })

  it('ne dit rien d’une fiche complète', () => {
    expect(issuesOf([page({ name: 'index', image: 'aaa' })])).toEqual([])
  })
})
