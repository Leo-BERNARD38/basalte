import { describe, expect, it } from 'vitest'

import { resolveLanguages } from '../site/languages.js'
import { f } from './define.js'
import { translationProgress } from './progress.js'

const mono = resolveLanguages({ fr: { default: true } })
const withDraft = resolveLanguages({
  fr: { default: true },
  en: { draft: true },
})

const fields = {
  title: f.text({ i18n: true }),
  side: f.select({ options: [{ value: 'g', label: 'Gauche' }] }),
  cta: f.group({ fields: { label: f.text({ i18n: true }), href: f.url() } }),
  items: f.list({ of: { caption: f.text({ i18n: true }) } }),
}

describe('translationProgress', () => {
  it('ne rend rien sur un site monolingue', () => {
    expect(translationProgress(fields, {}, mono)).toEqual([])
  })

  it('compte les champs traduisibles des groupes et des listes', () => {
    const values = {
      title: { fr: 'Bonjour' },
      side: 'g',
      cta: { label: { fr: 'Aller' }, href: '/x' },
      items: [{ caption: { fr: 'Une' } }, { caption: { fr: 'Deux' } }],
    }

    expect(translationProgress(fields, values, withDraft)).toEqual([
      { language: 'en', filled: 0, total: 4 },
    ])
  })

  it('ne compte pas un champ vide dans la langue par défaut', () => {
    const values = { title: { fr: '' }, cta: { label: { fr: 'Aller' } } }

    expect(translationProgress(fields, values, withDraft)).toEqual([
      { language: 'en', filled: 0, total: 1 },
    ])
  })

  it('compte les traductions déjà faites', () => {
    const values = {
      title: { fr: 'Bonjour', en: 'Hello' },
      cta: { label: { fr: 'Aller', en: '  ' } },
    }

    expect(translationProgress(fields, values, withDraft)).toEqual([
      { language: 'en', filled: 1, total: 2 },
    ])
  })
})
