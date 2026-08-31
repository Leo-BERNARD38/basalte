import { describe, expect, it } from 'vitest'

import {
  dkimHost,
  dmarcHost,
  domainOf,
  providerDns,
  readDkim,
  readDmarc,
  readSpf,
  sendingDomains,
} from './dns.js'
import { VARIABLES } from './provider.js'

describe('providerDns', () => {
  it('connaît Brevo, ses sélecteurs en tête', () => {
    const brevo = providerDns('brevo')

    expect(brevo?.spf).toBe('spf.brevo.com')
    expect(brevo?.dkimSelectors).toContain('brevo1')
    expect(brevo?.dkimSelectors).toContain('mail')
  })

  it('ne devine rien d’un fournisseur inconnu', () => {
    expect(providerDns('un-autre')).toBeUndefined()
  })
})

describe('sendingDomains', () => {
  it('prend le domaine de l’adresse d’envoi, pas celui du site', () => {
    expect(
      sendingDomains({ [VARIABLES.from]: 'bonjour@courrier.exemple.fr' }),
    ).toEqual(['courrier.exemple.fr'])
  })

  it('ajoute celui du canal des codes de connexion quand il diffère', () => {
    expect(
      sendingDomains({
        [VARIABLES.from]: 'bonjour@exemple.fr',
        [VARIABLES.authFrom]: 'connexion@compte.exemple.fr',
      }),
    ).toEqual(['exemple.fr', 'compte.exemple.fr'])
  })

  it('ne sonde pas deux fois le même domaine', () => {
    expect(
      sendingDomains({
        [VARIABLES.from]: 'bonjour@exemple.fr',
        [VARIABLES.authFrom]: 'connexion@exemple.fr',
      }),
    ).toEqual(['exemple.fr'])
  })

  it('rend une liste vide quand aucune adresse n’est renseignée', () => {
    expect(sendingDomains({})).toEqual([])
    expect(sendingDomains({ [VARIABLES.from]: 'pas-une-adresse' })).toEqual([])
  })
})

describe('les noms interrogés', () => {
  it('sont ceux que le protocole attend', () => {
    expect(dkimHost('exemple.fr', 'brevo1')).toBe(
      'brevo1._domainkey.exemple.fr',
    )
    expect(dmarcHost('exemple.fr')).toBe('_dmarc.exemple.fr')
  })
})

describe('domainOf', () => {
  it('coupe à la dernière arobase, et met en minuscules', () => {
    expect(domainOf(' Bonjour@Exemple.FR ')).toBe('exemple.fr')
  })
})

describe('readSpf', () => {
  const brevo = providerDns('brevo')

  it('ne trouve rien quand aucun enregistrement ne commence par v=spf1', () => {
    expect(readSpf(['google-site-verification=abc'])).toEqual({
      kind: 'absent',
    })
  })

  it('nomme le fournisseur quand il y figure', () => {
    const verdict = readSpf(['v=spf1 include:spf.brevo.com ~all'], brevo)

    expect(verdict).toEqual({
      kind: 'found',
      record: 'v=spf1 include:spf.brevo.com ~all',
      names: true,
    })
  })

  // Une délégation peut l’y mettre sans qu’une seule requête la suive : le
  // constat vaut mieux qu’un verdict.
  it('constate son absence sans conclure', () => {
    const verdict = readSpf(['v=spf1 include:_spf.google.com ~all'], brevo)

    expect(verdict).toEqual({
      kind: 'found',
      record: 'v=spf1 include:_spf.google.com ~all',
      names: false,
    })
  })

  it('ne nomme personne quand le fournisseur est inconnu', () => {
    expect(readSpf(['v=spf1 ~all'])).toMatchObject({ names: false })
  })
})

describe('readDkim', () => {
  it('reconnaît une clé publiée, quelle que soit sa casse', () => {
    expect(readDkim(['v=DKIM1; k=rsa; p=MIGfMA0'])).toBe(true)
    expect(readDkim(['v=dkim1; k=rsa; p=MIGfMA0'])).toBe(true)
  })

  it('ne prend pas un enregistrement voisin pour une clé', () => {
    expect(readDkim([])).toBe(false)
    expect(readDkim(['v=spf1 ~all'])).toBe(false)
  })
})

describe('readDmarc', () => {
  it('rend la politique déclarée', () => {
    expect(readDmarc(['v=DMARC1; p=quarantine; rua=mailto:a@b.fr'])).toEqual({
      kind: 'found',
      policy: 'quarantine',
    })
  })

  it('retombe sur « none » quand la politique manque', () => {
    expect(readDmarc(['v=DMARC1; rua=mailto:a@b.fr'])).toEqual({
      kind: 'found',
      policy: 'none',
    })
  })

  it('ne trouve rien sur un domaine sans DMARC', () => {
    expect(readDmarc([])).toEqual({ kind: 'absent' })
  })
})
