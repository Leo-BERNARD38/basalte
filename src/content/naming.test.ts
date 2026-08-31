import { describe, expect, it } from 'vitest'

import { isServiceRoute, pageLabel, routeOf, THANKS_PAGE } from './naming.js'

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
