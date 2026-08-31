// Ce que les blocs de référence promettent au contenu déjà écrit. Un bloc n’a
// que deux fichiers (invariant 7) : leurs vérifications se réunissent ici.

import { describe, expect, it } from 'vitest'

import { validatePage } from '../content/validate.js'
import { renderRichtext } from '../fields/richtext.js'
import { resolveLanguages } from '../site/languages.js'
import contact from './contact/schema.js'
import faq from './faq/schema.js'
import richtext from './richtext/schema.js'

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
  const context = { language: 'fr', url: 'https://exemple.fr/aide' }

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
