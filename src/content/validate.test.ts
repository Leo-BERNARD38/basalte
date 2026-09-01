import { describe, expect, it } from 'vitest'

import { block } from '../blocks/define.js'
import { f } from '../fields/define.js'
import { resolveLanguages } from '../site/languages.js'
import { renderIssue } from './report.js'
import { validatePage } from './validate.js'

const brochure = block({
  name: 'brochure',
  label: 'Document à télécharger',
  fields: {
    file: f.document({ label: 'Le fichier' }),
  },
})

const hero = block({
  name: 'hero',
  label: 'Bandeau principal',
  fields: {
    title: f.text({ label: 'Titre', i18n: true, required: true, max: 20 }),
    image: f.image({ label: 'Image de fond' }),
    cta: f.group({
      label: 'Bouton',
      fields: {
        label: f.text({ label: 'Libellé', i18n: true }),
        href: f.url({ label: 'Lien' }),
      },
    }),
  },
})

const faq = block({
  name: 'faq',
  label: 'Questions fréquentes',
  fields: {
    items: f.list({
      label: 'Questions',
      itemLabel: 'question',
      of: {
        question: f.text({ label: 'Question', i18n: true, required: true }),
        answer: f.textarea({ label: 'Réponse', i18n: true }),
      },
    }),
  },
})

const registry = { hero, brochure, faq }
const media = {
  a3f2c1d4b5e6f708: {
    format: 'webp',
    width: 1200,
    height: 800,
    widths: [480, 1200],
    alt: { fr: 'Une image', en: 'A picture' },
  },
}
const documents = {
  '9f1c2d3e4a5b6c70': { name: 'Conditions générales.pdf', bytes: 12_400 },
}
const mono = resolveLanguages({ fr: { default: true } })
const bothOnline = resolveLanguages({ fr: { default: true }, en: {} })
const withDraft = resolveLanguages({
  fr: { default: true },
  en: { draft: true },
})

function page(overrides: Record<string, unknown> = {}) {
  return {
    $format: 1,
    meta: { title: { fr: 'Accueil' }, description: { fr: 'Une page.' } },
    blocks: [
      {
        id: 'b1a2',
        type: 'hero',
        props: {
          title: { fr: 'Bonjour' },
          image: 'a3f2c1d4b5e6f708',
          cta: { label: { fr: 'Écrire' }, href: '/contact' },
        },
      },
    ],
    ...overrides,
  }
}

function run(source: unknown, languages = mono) {
  return validatePage({
    name: 'index',
    source,
    registry,
    languages,
    media,
    documents,
  })
}

describe('validatePage — les documents', () => {
  it('accepte un document présent au manifeste', () => {
    const result = run(
      page({
        blocks: [
          {
            id: 'd1',
            type: 'brochure',
            props: { file: '9f1c2d3e4a5b6c70' },
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
  })

  it('refuse un document absent du manifeste', () => {
    const result = run(
      page({
        blocks: [{ id: 'd1', type: 'brochure', props: { file: 'disparu' } }],
      }),
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Document à télécharger » › Le fichier : le document « disparu » n’est pas dans la médiathèque',
    )
  })
})

describe('validatePage', () => {
  it('accepte un contenu valide et le rend', () => {
    const result = run(page())

    expect(result.issues).toEqual([])
    expect(result.page?.blocks[0]?.type).toBe('hero')
  })

  it('refuse un type de section inconnu', () => {
    const result = run(
      page({ blocks: [{ id: 'x1', type: 'carrousel', props: {} }] }),
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « carrousel » : « carrousel » n’est pas un type de section connu',
    )
    expect(result.page).toBeUndefined()
  })

  it('refuse une page sans description : c’est ce que Google affiche sous le titre', () => {
    const result = run(page({ meta: { title: { fr: 'Accueil' } } }))

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › Description (français) : doit être rempli',
    )
    expect(result.page).toBeUndefined()
  })

  it('rend le rang de l’élément fautif dans une liste', () => {
    const result = run(
      page({
        blocks: [
          {
            id: 'q1',
            type: 'faq',
            props: {
              items: [
                { question: { fr: 'Où ?' }, answer: { fr: 'Ici.' } },
                { question: { fr: '' }, answer: { fr: 'Là.' } },
              ],
            },
          },
        ],
      }),
    )

    expect(result.issues[0]?.path).toEqual(['items', 1, 'question', 'fr'])
    expect(result.issues[0]?.section?.id).toBe('q1')
  })

  it('rend le chemin d’un champ logé dans un groupe', () => {
    const result = run(
      page({
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: {
              title: { fr: 'Bonjour' },
              cta: { label: { fr: 'Voir' }, href: 'pas une adresse' },
            },
          },
        ],
      }),
    )

    expect(result.issues[0]?.path).toEqual(['cta', 'href'])
  })

  // Le chemin machine, celui que le panel suit jusqu’au champ fautif (D166) :
  // « field » ne sert qu’à écrire une phrase, et deux champs peuvent porter le
  // même libellé.
  it('rend le chemin du champ fautif, sa langue comprise', () => {
    const result = run(page({ meta: { title: { fr: 'Accueil' } } }))

    expect(result.issues[0]?.path).toEqual(['description', 'fr'])
    expect(result.issues[0]?.language).toBe('fr')
  })

  it('n’exige pas la description d’une langue en préparation', () => {
    const result = run(
      page({
        meta: {
          title: { fr: 'Accueil', en: 'Home' },
          description: { fr: 'Une page.' },
        },
      }),
      withDraft,
    )

    expect(result.page).toBeDefined()
  })

  it('refuse un champ requis laissé vide', () => {
    const result = run(
      page({
        blocks: [{ id: 'b1a2', type: 'hero', props: { title: { fr: '' } } }],
      }),
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Bandeau principal » › Titre (français) : doit être rempli',
    )
  })

  it('refuse un texte trop long, et nomme la langue fautive', () => {
    const result = run(
      page({
        meta: {
          title: { fr: 'Accueil', en: 'Home' },
          description: { fr: 'Une page.', en: 'A page.' },
        },
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: {
              title: { fr: 'Bonjour', en: 'Beaucoup beaucoup trop long' },
            },
          },
        ],
      }),
      bothOnline,
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Bandeau principal » › Titre (anglais) : dépasse 20 caractères',
    )
  })

  it('refuse une traduction manquante dans une langue en ligne', () => {
    const result = run(
      page({
        meta: {
          title: { fr: 'Accueil', en: 'Home' },
          description: { fr: 'Une page.', en: 'A page.' },
        },
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: {
              title: { fr: 'Bonjour', en: 'Hello' },
              cta: { label: { fr: 'Écrire', en: '' }, href: '/contact' },
            },
          },
        ],
      }),
      bothOnline,
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Bandeau principal » › Bouton › Libellé (anglais) : traduction manquante',
    )
  })

  it('avertit sans bloquer sur une langue en préparation', () => {
    const result = run(page(), withDraft)

    expect(result.issues).toEqual([
      {
        severity: 'warning',
        page: 'index',
        language: 'en',
        message: 'anglais en préparation : 0 champs traduits sur 4',
      },
    ])
    expect(result.page).toBeDefined()
  })

  it('refuse un format de contenu en retard, et nomme la commande', () => {
    const result = run(page({ $format: 0 }))

    expect(result.issues[0]?.message).toBe(
      'format de contenu 0, le socle attend 1 — lance « basalte migrate »',
    )
    expect(result.page).toBeUndefined()
  })

  it('refuse un numéro de format qui n’en est pas un', () => {
    expect(run(page({ $format: 0.5 })).issues[0]?.message).toMatch(
      /structure de fichier invalide/,
    )
  })

  it('refuse un format écrit par un socle plus récent', () => {
    const result = run(page({ $format: 9 }))

    expect(result.issues[0]?.message).toMatch(/plus récent/)
  })

  it('refuse deux sections portant le même identifiant', () => {
    const twice = page().blocks[0]!
    const result = run(page({ blocks: [twice, twice] }))

    expect(result.issues[0]?.message).toMatch(/déjà porté/)
  })

  it('refuse une image qui n’est pas dans la médiathèque', () => {
    const result = run(
      page({
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: { title: { fr: 'Bonjour' }, image: 'disparue' },
          },
        ],
      }),
    )

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Bandeau principal » › Image de fond : l’image « disparue » n’est pas dans la médiathèque',
    )
  })

  it('refuse une image sans texte alternatif dans une langue en ligne', () => {
    const result = validatePage({
      name: 'index',
      source: page({
        meta: {
          title: { fr: 'Accueil', en: 'Home' },
          description: { fr: 'Une page.', en: 'A page.' },
        },
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: {
              title: { fr: 'Bonjour', en: 'Hello' },
              image: 'a3f2c1d4b5e6f708',
            },
          },
        ],
      }),
      registry,
      documents,
      languages: bothOnline,
      media: {
        a3f2c1d4b5e6f708: {
          ...media.a3f2c1d4b5e6f708,
          alt: { fr: 'Une image' },
        },
      },
    })

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Bandeau principal » › Image de fond (anglais) : texte alternatif manquant',
    )
  })

  it('n’exige rien d’un champ image laissé vide', () => {
    const result = run(
      page({
        blocks: [
          {
            id: 'b1a2',
            type: 'hero',
            props: { title: { fr: 'Bonjour' }, image: '' },
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
  })

  it('refuse une enveloppe qui n’a pas la bonne forme', () => {
    const result = run({ $format: 1, blocks: 'aucune' })

    expect(result.issues[0]?.message).toMatch(/structure de fichier invalide/)
    expect(result.page).toBeUndefined()
  })

  it('situe l’erreur dans une liste', () => {
    const gallery = block({
      name: 'gallery',
      label: 'Galerie',
      fields: {
        images: f.list({
          label: 'Images',
          of: { caption: f.text({ label: 'Légende', max: 3 }) },
        }),
      },
    })

    const result = validatePage({
      name: 'index',
      source: page({
        blocks: [
          {
            id: 'g1',
            type: 'gallery',
            props: { images: [{ caption: 'ok' }, { caption: 'trop long' }] },
          },
        ],
      }),
      registry: { gallery },
      documents,
      languages: mono,
      media,
    })

    expect(renderIssue(result.issues[0]!)).toBe(
      'index › section 1 « Galerie » › Images › élément 2 › Légende : dépasse 3 caractères',
    )
  })
})
