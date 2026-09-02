// Ce que les blocs de référence promettent au contenu déjà écrit. Un bloc n’a
// que deux fichiers (invariant 7) : leurs vérifications se réunissent ici.

import { describe, expect, it } from 'vitest'

import { validatePage } from '../content/validate.js'
import { renderRichtext } from '../fields/richtext.js'
import { dayLabel } from '../seo/business.js'
import { resolveLanguages } from '../site/languages.js'
import bento from './bento/schema.js'
import comparison from './comparison/schema.js'
import contact from './contact/schema.js'
import details from './contact-details/schema.js'
import faq from './faq/schema.js'
import logos from './logos/schema.js'
import showcase from './showcase/schema.js'
import richtext from './richtext/schema.js'
import stats from './stats/schema.js'
import steps from './steps/schema.js'

const languages = resolveLanguages({ fr: { default: true } })

describe('bloc contact — la mention de consentement', () => {
  it('accepte un lien, et refuse titres et listes', () => {
    const consent = contact.fields.consent

    expect(consent.kind).toBe('richtext')
    expect(
      renderRichtext(
        'Voir notre [politique de confidentialité](/confidentialite).',
        consent,
      ),
    ).toContain('href="/confidentialite"')
    expect(renderRichtext('## Titre', consent)).toBe('<p>## Titre</p>')
    expect(renderRichtext('- un', consent)).toBe('<p>- un</p>')
  })

  it('lit sans migration le contenu écrit quand le champ était un textarea', () => {
    const { issues } = validatePage({
      name: 'contact',
      source: {
        $format: 1,
        meta: { title: { fr: 'Nous écrire' }, description: { fr: 'Un mot.' } },
        blocks: [
          {
            id: 'formulaire',
            type: 'contact',
            props: {
              consent: { fr: 'Vos coordonnées servent à vous répondre.' },
            },
          },
        ],
      },
      registry: { contact },
      languages,
      media: {},
      documents: {},
    })

    expect(issues).toEqual([])
  })
})

describe('bloc richtext — la grammaire du corps', () => {
  it('accepte titres et listes', () => {
    const body = richtext.fields.body

    expect(renderRichtext('## Titre', body)).toBe('<h2>Titre</h2>')
    expect(renderRichtext('- un', body)).toBe('<ul><li>un</li></ul>')
  })
})

describe('bloc faq — les données structurées', () => {
  const context = {
    language: 'fr',
    url: 'https://exemple.fr/aide',
    origin: 'https://exemple.fr',
  }

  const items = [
    {
      question: { fr: 'Intervenez-vous le samedi ?' },
      answer: { fr: 'Oui, sur **rendez-vous**.' },
    },
  ]

  it('rend un FAQPage depuis les questions renseignées', () => {
    const node = faq.structured?.({ title: { fr: '' }, items }, context)

    expect(node).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Intervenez-vous le samedi ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '<p>Oui, sur <strong>rendez-vous</strong>.</p>',
          },
        },
      ],
    })
  })

  it('écarte une question vide plutôt que d’annoncer une entrée sans nom', () => {
    const node = faq.structured?.(
      {
        title: { fr: '' },
        items: [{ question: { fr: '   ' }, answer: { fr: 'Peu importe.' } }],
      },
      context,
    )

    expect(node).toBeUndefined()
  })

  it('échappe le contenu comme le rendu : aucune balise ne vient du texte', () => {
    const node = faq.structured?.(
      {
        title: { fr: '' },
        items: [
          {
            question: { fr: 'Et ceci ?' },
            answer: { fr: '<script>alert(1)</script>' },
          },
        ],
      },
      context,
    ) as { mainEntity: { acceptedAnswer: { text: string } }[] }

    expect(node.mainEntity[0]?.acceptedAnswer.text).not.toContain('<script>')
  })
})

describe('bloc steps — le numéro vient du rang', () => {
  it('n’offre aucun champ où le saisir', () => {
    expect(Object.keys(steps.fields.items.of)).toEqual(['title', 'body'])
  })
})

describe('bloc stats — la valeur porte son unité', () => {
  const page = (value: string) =>
    validatePage({
      name: 'index',
      source: {
        $format: 1,
        meta: { title: { fr: 'Atelier' }, description: { fr: 'Un mot.' } },
        blocks: [
          {
            id: 'chiffres',
            type: 'stats',
            props: {
              items: [
                { value: { fr: value }, label: { fr: 'de métier' } },
                { value: { fr: '+340' }, label: { fr: 'pièces livrées' } },
              ],
            },
          },
        ],
      },
      registry: { stats },
      languages,
      media: {},
      documents: {},
    })

  it('accepte un signe, une unité et une abréviation', () => {
    for (const value of ['+150', '12 ans', '100 %', '3 sem.']) {
      expect(page(value).issues).toEqual([])
    }
  })

  it('refuse au-delà de sa borne, là où un nombre n’en dit plus rien', () => {
    expect(page('douze années pleines').issues).not.toEqual([])
  })
})

describe('bloc contact-details — la fiche, pas une seconde saisie', () => {
  it('ne déclare ni adresse, ni téléphone, ni horaires', () => {
    expect(Object.keys(details.fields)).toEqual(['title', 'intro'])
  })

  it('nomme les jours comme la liste déroulante de la fiche', () => {
    expect(dayLabel('Monday')).toBe('Lundi')
    expect(dayLabel('Sunday')).toBe('Dimanche')
    expect(dayLabel('')).toBe('')
  })
})

describe('bloc logos — ce qu’il ne redemande pas', () => {
  it('laisse le nom de la marque au texte alternatif de la médiathèque', () => {
    expect(Object.keys(logos.fields.items.of)).toEqual(['image', 'href'])
  })

  it('n’attend aucunes proportions : un logo n’a pas de forme commune', () => {
    expect(logos.fields.items.of.image.ratio).toBeUndefined()
  })
})

describe('bloc showcase — le côté de l’image', () => {
  it('propose deux côtés, la droite d’abord', () => {
    expect(showcase.fields.side.options.map((option) => option.value)).toEqual([
      'right',
      'left',
    ])
  })

  it('exige son image : sans elle, la section n’a plus de sujet', () => {
    expect(showcase.fields.image.required).toBe(true)
    expect(showcase.fields.image.ratio).toBe('4/3')
  })

  it('ne borne pas ses points en haut : la mise en page ne casse pas', () => {
    expect(showcase.fields.points.max).toBeUndefined()
  })
})

describe('bloc bento — la carte décide de sa place', () => {
  it('porte la largeur sur l’élément, pas sur la section', () => {
    expect(Object.keys(bento.fields.items.of)).toEqual([
      'title',
      'body',
      'image',
      'size',
    ])
    expect(
      bento.fields.items.of.size.options.map((option) => option.value),
    ).toEqual(['normal', 'large'])
  })

  it('demande trois cartes : à deux, ce n’est plus une grille', () => {
    expect(bento.fields.items.min).toBe(3)
  })
})

describe('bloc comparison — deux colonnes, alignées par construction', () => {
  it('nomme ses colonnes une fois, et chaque ligne porte leurs deux valeurs', () => {
    expect(Object.keys(comparison.fields.left.fields)).toEqual(['name', 'note'])
    expect(Object.keys(comparison.fields.right.fields)).toEqual([
      'name',
      'note',
    ])
    expect(Object.keys(comparison.fields.rows.of)).toEqual([
      'label',
      'left',
      'right',
    ])
  })

  it('valide une comparaison écrite à la main', () => {
    const { issues } = validatePage({
      name: 'index',
      source: {
        $format: 1,
        meta: { title: { fr: 'Basalte' }, description: { fr: 'Un mot.' } },
        blocks: [
          {
            id: 'compare',
            type: 'comparison',
            props: {
              left: { name: { fr: 'Basalte' }, note: { fr: 'votre dépôt' } },
              right: { name: { fr: 'Une plateforme' }, note: { fr: '' } },
              rows: [
                {
                  label: { fr: 'Le contenu' },
                  left: { fr: 'chez vous' },
                  right: { fr: 'chez eux' },
                },
                {
                  label: { fr: 'Le coût' },
                  left: { fr: 'un hébergement' },
                  right: { fr: 'un abonnement' },
                },
              ],
            },
          },
        ],
      },
      registry: { comparison },
      languages,
      media: {},
      documents: {},
    })

    expect(issues).toEqual([])
  })

  it('refuse une comparaison à une seule ligne', () => {
    const { issues } = validatePage({
      name: 'index',
      source: {
        $format: 1,
        meta: { title: { fr: 'Basalte' }, description: { fr: 'Un mot.' } },
        blocks: [
          {
            id: 'compare',
            type: 'comparison',
            props: {
              left: { name: { fr: 'Basalte' } },
              right: { name: { fr: 'Une plateforme' } },
              rows: [{ label: { fr: 'Le contenu' } }],
            },
          },
        ],
      },
      registry: { comparison },
      languages,
      media: {},
      documents: {},
    })

    expect(issues).not.toEqual([])
  })
})
