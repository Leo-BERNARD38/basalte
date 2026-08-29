import { describe, expect, it } from 'vitest'

import { HERE } from '../auth.fixture.js'
import { deviceTrusted, repeatedFailures, signInCode } from './messages.js'

const SITE = 'Atelier Démonstration'

describe('signInCode', () => {
  it('porte le code dans les deux versions, jamais dans l’objet', () => {
    const letter = signInCode(SITE, '481902', 10, HERE)

    expect(letter.text).toContain('481902')
    expect(letter.html).toContain('481902')
    expect(letter.subject).not.toContain('481902')
    expect(letter.subject).toContain(SITE)
  })

  it('dit la durée de validité et l’origine de la demande', () => {
    const letter = signInCode(SITE, '481902', 10, HERE)

    expect(letter.text).toContain('10 minutes')
    expect(letter.text).toContain(HERE.ip)
    expect(letter.text).toContain(HERE.agent)
  })

  it('dit quoi faire quand on n’a rien demandé', () => {
    expect(signInCode(SITE, '481902', 10, HERE).text).toContain('ignorez')
  })
})

describe('deviceTrusted', () => {
  it('nomme le site et l’appareil', () => {
    const letter = deviceTrusted(SITE, HERE)

    expect(letter.subject).toContain('Nouvel appareil')
    expect(letter.text).toContain(HERE.agent)
  })
})

describe('repeatedFailures', () => {
  it('donne le compte des échecs', () => {
    expect(repeatedFailures(SITE, 5, HERE).text).toContain('5 tentatives')
  })
})

describe('échappement', () => {
  it('n’ouvre aucune balise depuis un navigateur annoncé', () => {
    const hostile = {
      ip: '"><script>alert(1)</script>',
      agent: '<img src=x onerror="alert(1)">',
    }

    const letter = signInCode(SITE, '000000', 10, hostile)

    expect(letter.html).not.toContain('<script')
    expect(letter.html).not.toContain('<img')
    expect(letter.html).toContain('&lt;script')
    expect(letter.html).toContain('&lt;img')
  })

  it('n’ouvre aucune balise depuis le nom du site', () => {
    const letter = deviceTrusted('<b>Atelier</b>', HERE)

    expect(letter.html).not.toContain('<b>')
    expect(letter.html).toContain('&lt;b&gt;')
  })

  it('remplace l’inconnu plutôt que de laisser un vide', () => {
    const letter = signInCode(SITE, '000000', 10, { ip: '', agent: '' })

    expect(letter.text).toContain('navigateur inconnu')
    expect(letter.text).toContain('adresse inconnue')
  })
})
