import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { readView, render } from './content.js'

const DEMO = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'examples',
  'demo',
)

const view = await readView(DEMO)

describe('readView', () => {
  it('ouvre par l’accueil, quel que soit l’ordre du disque', () => {
    expect(view.pages[0]?.route).toBe('/')
  })

  it('dit quelle page porte quelle section, sans qu’un JSON soit ouvert', () => {
    const contact = view.pages.find((page) => page.route === '/contact')

    expect(contact?.sections.map((section) => section.type)).toEqual([
      'contact',
      'contact-details',
    ])
  })

  it('marque une page de service, que le sitemap et le menu écartent', () => {
    expect(view.pages.find((page) => page.route === '/merci')?.service).toBe(
      true,
    )
  })

  it('compte les traductions d’une langue en préparation', () => {
    const home = view.pages.find((page) => page.route === '/')
    const english = home?.translations.find((entry) => entry.language === 'en')

    expect(english?.filled).toBe(0)
    expect(english?.total).toBeGreaterThan(0)
  })

  it('rend la vignette de partage effective, repli compris', () => {
    expect(view.pages.find((page) => page.route === '/')?.share).not.toBe('')
  })

  it('range les deux emplacements du chrome dans l’ordre où ils s’affichent', () => {
    expect(view.chrome.map((slot) => slot.slot)).toEqual(['header', 'footer'])
  })

  it('ne compte aucune image sans texte alternatif : il est exigé au dépôt', () => {
    expect(view.media.withoutAlt).toEqual([])
  })
})

describe('render', () => {
  const lines = render(view).join('\n')

  it('nomme chaque route', () => {
    for (const page of view.pages) expect(lines).toContain(page.route)
  })

  it('nomme chaque section par son type et son identifiant', () => {
    const first = view.pages[0]?.sections[0]

    expect(first).toBeDefined()
    expect(lines).toContain(`${first?.type} ${first?.id}`)
  })

  it('dit la langue en préparation en toutes lettres', () => {
    expect(lines).toContain('anglais — en préparation')
  })
})
