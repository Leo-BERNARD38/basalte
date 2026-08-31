// Ce que le socle dit de lui-même : sa version, son adresse, et ce qu’un dépôt
// client en épingle.

import { describe, expect, it } from 'vitest'

import {
  compareVersions,
  isMistagged,
  isPublished,
  lines,
  readSocle,
  socleDependency,
  socleRawUrl,
  socleRemote,
  versionsAfter,
  versionsOf,
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

describe('versionsOf', () => {
  it('ne retient que le semver strict, et l’ordonne', () => {
    expect(versionsOf(['v1.5.0', 'main', 'v1.4.0', 'v2.0.0-rc1'])).toEqual([
      '1.4.0',
      '1.5.0',
    ])
  })

  it('ignore un tag sans son « v »', () => {
    expect(versionsOf(['0.1.0'])).toEqual([])
  })
})

describe('isMistagged', () => {
  it('reconnaît la version taguée sans son « v »', () => {
    expect(isMistagged('0.1.0', ['0.1.0'])).toBe(true)
  })

  it('se tait dès que le bon tag est là', () => {
    expect(isMistagged('0.1.0', ['0.1.0', 'v0.1.0'])).toBe(false)
  })

  it('se tait quand rien ne nomme cette version', () => {
    expect(isMistagged('0.1.0', ['v0.0.9'])).toBe(false)
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
