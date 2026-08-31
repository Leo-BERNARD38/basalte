import { describe, expect, it } from 'vitest'

import {
  checkRedirects,
  danglingRedirects,
  shadowedRedirects,
} from './redirects.js'

describe('checkRedirects', () => {
  it('accepte un chemin du site et une adresse complète', () => {
    expect(() =>
      checkRedirects({
        '/ancienne': '/nouvelle',
        '/ailleurs': 'https://exemple.fr/page',
      }),
    ).not.toThrow()
  })

  it('refuse une source qui n’est pas un chemin', () => {
    expect(() => checkRedirects({ ancienne: '/nouvelle' })).toThrow(/barre/)
  })

  it('refuse une cible qui n’est ni un chemin ni une adresse', () => {
    expect(() => checkRedirects({ '/a': 'exemple.fr' })).toThrow(/ni un chemin/)
  })

  it('refuse une boucle sur elle-même', () => {
    expect(() => checkRedirects({ '/a': '/a' })).toThrow(/elle-même/)
  })

  it('refuse une chaîne de deux redirections, et dit quoi écrire', () => {
    expect(() => checkRedirects({ '/a': '/b', '/b': '/c' })).toThrow(
      /« \/a » vers « \/c »/,
    )
  })
})

describe('shadowedRedirects', () => {
  it('nomme une redirection qu’une page recouvre', () => {
    expect(shadowedRedirects({ '/contact': '/' }, ['/', '/contact'])).toEqual([
      '/contact',
    ])
  })

  it('ne dit rien d’une redirection depuis une adresse disparue', () => {
    expect(shadowedRedirects({ '/ancienne': '/' }, ['/'])).toEqual([])
  })
})

describe('danglingRedirects', () => {
  it('nomme une cible interne qui n’existe pas', () => {
    expect(danglingRedirects({ '/a': '/absente' }, ['/'])).toEqual(['/a'])
  })

  it('laisse passer une cible externe, qu’il ne peut pas vérifier', () => {
    expect(danglingRedirects({ '/a': 'https://exemple.fr' }, ['/'])).toEqual([])
  })
})
