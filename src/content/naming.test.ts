import { describe, expect, it } from 'vitest'

import {
  inNavigationOrder,
  isServiceRoute,
  pageHeading,
  pageLabel,
  routeOf,
  THANKS_PAGE,
} from './naming.js'

describe('routeOf', () => {
  it('donne la racine à l’accueil, et son nom aux autres', () => {
    expect(routeOf('index')).toBe('/')
    expect(routeOf('mentions-legales')).toBe('/mentions-legales')
  })
})

describe('pageLabel', () => {
  it('nomme l’accueil, et met les autres en forme', () => {
    expect(pageLabel('index')).toBe('Accueil')
    expect(pageLabel('mentions-legales')).toBe('Mentions legales')
  })
})

describe('pageHeading', () => {
  it('retire le nom du site qui termine un titre', () => {
    expect(pageHeading('Actualités — Basalte', 'Basalte')).toBe('Actualités')
    expect(pageHeading('Contact | Basalte', 'basalte')).toBe('Contact')
    expect(pageHeading('Contact - Atelier N.', 'Atelier N.')).toBe('Contact')
  })

  it('garde un titre qui ne le porte pas, ou qui n’est que lui', () => {
    expect(pageHeading('Nous écrire', 'Basalte')).toBe('Nous écrire')
    expect(pageHeading('Basalte', 'Basalte')).toBe('Basalte')
    expect(pageHeading('Basalte en ville', 'Basalte')).toBe('Basalte en ville')
    expect(pageHeading('', 'Basalte')).toBe('')
  })
})

describe('inNavigationOrder', () => {
  it('met l’accueil en tête, la page de service en queue, et garde le reste', () => {
    const names = inNavigationOrder([
      { name: 'contact' },
      { name: THANKS_PAGE },
      { name: 'index' },
      { name: 'actualites' },
    ]).map((page) => page.name)

    expect(names).toEqual(['index', 'contact', 'actualites', THANKS_PAGE])
  })
})

// Le menu déduit, le sitemap et l’index posent la même question : trois
// conditions écrites à la main auraient divergé, et l’oubli aurait été muet.
describe('isServiceRoute', () => {
  it('reconnaît la page de remerciement', () => {
    expect(isServiceRoute(routeOf(THANKS_PAGE))).toBe(true)
  })

  it('laisse passer une page ordinaire, racine comprise', () => {
    expect(isServiceRoute('/')).toBe(false)
    expect(isServiceRoute('/contact')).toBe(false)
    expect(isServiceRoute(`/${THANKS_PAGE}-des-clients`)).toBe(false)
  })
})
