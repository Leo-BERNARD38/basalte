import { describe, expect, it } from 'vitest'

import { clearCookie, COOKIES, readCookie, setCookie } from './cookies.js'

describe('setCookie', () => {
  it('pose les trois attributs qui portent la sécurité', () => {
    const cookie = setCookie(COOKIES.session, 'jeton', { maxAge: 60 })

    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('Max-Age=60')
  })

  it('encode une valeur qui contient un séparateur', () => {
    const cookie = setCookie('x', 'a;b=c d', { maxAge: 1 })

    expect(cookie.split(';')[0]).toBe('x=a%3Bb%3Dc%20d')
  })

  it('arrondit une durée fractionnaire et refuse le négatif', () => {
    expect(setCookie('x', 'y', { maxAge: 12.9 })).toContain('Max-Age=12')
    expect(setCookie('x', 'y', { maxAge: -5 })).toContain('Max-Age=0')
  })
})

describe('readCookie — valeur illisible', () => {
  // Un sous-domaine pose un cookie pour le domaine parent : une valeur mal
  // encodée ne doit pas faire répondre 500 à chaque requête du navigateur.
  it('vaut absente plutôt que de lever', () => {
    for (const raw of ['%', '%zz', 'a%E0%A4b']) {
      expect(() =>
        readCookie(`${COOKIES.session}=${raw}`, COOKIES.session),
      ).not.toThrow()
      expect(readCookie(`${COOKIES.session}=${raw}`, COOKIES.session)).toBe(
        undefined,
      )
    }
  })

  it('ne laisse pas un cookie illisible en cacher un autre', () => {
    expect(
      readCookie(
        `${COOKIES.attempt}=%; ${COOKIES.session}=bon`,
        COOKIES.session,
      ),
    ).toBe('bon')
  })
})

describe('clearCookie', () => {
  it('vide la valeur et met la durée à zéro', () => {
    const cookie = clearCookie(COOKIES.device)

    expect(cookie.startsWith(`${COOKIES.device}=;`)).toBe(true)
    expect(cookie).toContain('Max-Age=0')
  })
})

describe('readCookie', () => {
  it('trouve un cookie parmi d’autres', () => {
    const header = 'a=1; basalte_session=jeton; b=2'

    expect(readCookie(header, COOKIES.session)).toBe('jeton')
  })

  it('décode ce que setCookie a encodé', () => {
    const cookie = setCookie('x', 'a;b', { maxAge: 1 }).split(';')[0] ?? ''

    expect(readCookie(cookie, 'x')).toBe('a;b')
  })

  it('ne confond pas un cookie avec un autre dont il est le suffixe', () => {
    expect(readCookie('xbasalte_session=faux', COOKIES.session)).toBeUndefined()
  })

  it('rend undefined sans en-tête, ou pour un nom absent', () => {
    expect(readCookie(null, COOKIES.session)).toBeUndefined()
    expect(readCookie('a=1', COOKIES.session)).toBeUndefined()
  })
})
