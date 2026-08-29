import { describe, expect, it } from 'vitest'

import {
  CODE_DIGITS,
  codeFingerprint,
  fingerprint,
  newCode,
  newToken,
  sameSecret,
  TOKEN_BYTES,
} from './secrets.js'

describe('newToken', () => {
  it('porte 256 bits, en base64url', () => {
    const token = newToken()

    expect(Buffer.from(token, 'base64url')).toHaveLength(TOKEN_BYTES)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('ne se répète pas', () => {
    const drawn = new Set(Array.from({ length: 500 }, () => newToken()))

    expect(drawn.size).toBe(500)
  })
})

describe('newCode', () => {
  it('fait toujours six chiffres, zéros de tête compris', () => {
    for (let draw = 0; draw < 500; draw += 1) {
      expect(newCode()).toMatch(new RegExp(`^\\d{${CODE_DIGITS}}$`))
    }
  })

  it('couvre l’étendue, sans se cantonner à quelques valeurs', () => {
    const drawn = new Set(Array.from({ length: 500 }, () => newCode()))

    expect(drawn.size).toBeGreaterThan(450)
  })
})

describe('fingerprint', () => {
  it('rend la même empreinte pour la même valeur', () => {
    expect(fingerprint('a')).toBe(fingerprint('a'))
    expect(fingerprint('a')).not.toBe(fingerprint('b'))
    expect(fingerprint('a')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('codeFingerprint', () => {
  it('lie le code à sa tentative : le même code ailleurs ne vaut rien', () => {
    const code = '123456'

    expect(codeFingerprint('tentative-a', code)).not.toBe(
      codeFingerprint('tentative-b', code),
    )
  })

  it('ne se laisse pas reconstruire par déplacement du séparateur', () => {
    expect(codeFingerprint('ab', '123456')).not.toBe(
      codeFingerprint('ab:123456', ''),
    )
  })
})

describe('sameSecret', () => {
  it('compare des valeurs de même longueur', () => {
    expect(sameSecret('abc', 'abc')).toBe(true)
    expect(sameSecret('abc', 'abd')).toBe(false)
  })

  it('rend faux sans lever quand les longueurs diffèrent', () => {
    expect(sameSecret('abc', 'ab')).toBe(false)
    expect(sameSecret('', 'a')).toBe(false)
  })
})
