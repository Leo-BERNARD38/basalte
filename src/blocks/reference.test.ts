// Ce que les blocs de référence promettent au contenu déjà écrit. Un bloc n’a
// que deux fichiers (invariant 7) : leurs vérifications se réunissent ici.

import { describe, expect, it } from 'vitest'

import { validatePage } from '../content/validate.js'
import { renderRichtext } from '../fields/richtext.js'
import { resolveLanguages } from '../site/languages.js'
import contact from './contact/schema.js'
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
