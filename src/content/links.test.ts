// Les liens internes qui ne mènent nulle part. Ils avertissent, jamais ils ne
// refusent : un lien vers une page à venir n’est pas une panne.

import { describe, expect, it } from 'vitest'

import { f } from '../fields/define.js'
import { resolveLanguages } from '../site/languages.js'
import { unknownLinks } from './links.js'

const FIELDS = {
  links: f.list({
    of: {
      label: f.text({ i18n: true }),
      href: f.url(),
    },
  }),
}

const ROUTES = ['/', '/contact', '/mentions-legales']

function check(hrefs: readonly string[], bilingual = false) {
  return unknownLinks({
    name: 'chrome',
    fields: FIELDS,
    values: { links: hrefs.map((href) => ({ label: {}, href })) },
    routes: ROUTES,
    languages: resolveLanguages(
      bilingual ? { fr: { default: true }, en: {} } : { fr: { default: true } },
    ),
  })
}

describe('unknownLinks', () => {
  it('ne dit rien d’un chemin qui mène à une page', () => {
    expect(check(['/', '/contact', '/mentions-legales'])).toEqual([])
  })

  it('nomme le chemin qui ne mène nulle part, sans refuser', () => {
    const issues = check(['/services'])

    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.message).toContain('/services')
  })

  // Un site bilingue porte les mêmes pages sous plusieurs adresses : les
  // signaler serait un faux positif à chaque lien traduit.
  it('accepte une adresse préfixée d’une langue déclarée', () => {
    expect(check(['/en/contact'], true)).toEqual([])
    expect(check(['/en/contact'])).toHaveLength(1)
  })

  it('laisse passer ce qui n’est pas un chemin du site', () => {
    expect(
      check(['https://exemple.fr', 'mailto:a@b.fr', 'tel:+33', '#ancre', '']),
    ).toEqual([])
  })
})
