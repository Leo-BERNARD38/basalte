// Ce que le socle dit de lui-même : sa version, son adresse, et ce qu’un dépôt
// client en épingle.

import { describe, expect, it } from 'vitest'

import {
  compareVersions,
  isPublished,
  lines,
  readSocle,
  socleDependency,
  socleRawUrl,
  socleRemote,
  versionsAfter,
  type Socle,
} from './socle.js'

const SOCLE: Socle = {
  name: '@leobernard/basalte',
  version: '1.4.0',
  astro: '7.2.9',
  repository: 'Leo-BERNARD38/basalte',
}

describe('readSocle', () => {
  it('lit le manifeste du paquet, pas des valeurs écrites à la main', () => {
    const socle = readSocle()

    expect(socle.name).toBe('@leobernard/basalte')
    expect(socle.repository).toBe('Leo-BERNARD38/basalte')
    expect(socle.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(socle.astro).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('les adresses du socle', () => {
  it('épinglent la version par son tag', () => {
    expect(socleDependency(SOCLE)).toBe('github:Leo-BERNARD38/basalte#v1.4.0')
    expect(socleRemote(SOCLE)).toBe(
      'https://github.com/Leo-BERNARD38/basalte.git',
    )
    expect(socleRawUrl(SOCLE, 'v1.4.0', 'notes/v1.4.0.md')).toBe(
      'https://raw.githubusercontent.com/Leo-BERNARD38/basalte/v1.4.0/notes/v1.4.0.md',
    )
  })
})

// Un dépôt client épingle la version qui l’a généré : sans son tag, son
// installation échoue, et elle échoue après que tout a été écrit.
describe('isPublished', () => {
  it('reconnaît une version publiée', () => {
    expect(isPublished('1.4.0', ['1.3.0', '1.4.0'])).toBe(true)
  })

  it('refuse une version dont le tag n’existe pas', () => {
    expect(isPublished('1.4.0', ['1.3.0'])).toBe(false)
    expect(isPublished('1.4.0', [])).toBe(false)
  })
})

describe('compareVersions', () => {
  it('range par nombre, jamais par ordre alphabétique', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
    expect(compareVersions('1.4.0', '1.4.0')).toBe(0)
  })
})

describe('versionsAfter', () => {
  it('ne garde que ce qui est strictement plus récent', () => {
    expect(
      versionsAfter('1.4.0', ['1.3.0', '1.4.0', '1.5.0', '2.0.0']),
    ).toEqual(['1.5.0', '2.0.0'])
  })

  it('rend une liste vide quand le site est à jour', () => {
    expect(versionsAfter('2.0.0', ['1.5.0', '2.0.0'])).toEqual([])
  })
})

describe('lines', () => {
  it('coupe aussi les fins de ligne de Windows', () => {
    expect(lines('a\r\nb\nc')).toEqual(['a', 'b', 'c'])
  })
})
