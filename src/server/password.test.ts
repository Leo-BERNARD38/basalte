import { describe, expect, it } from 'vitest'

import {
  burnTime,
  checkPassword,
  generatePassword,
  hashPassword,
  MINIMUM_LENGTH,
  verifyPassword,
} from './password.js'

const SHAPE = /^[a-zA-Z2-9]{5}(-[a-zA-Z2-9]{5}){3}$/

describe('generatePassword', () => {
  it('produit quatre groupes de cinq, dictables', () => {
    for (let draw = 0; draw < 200; draw += 1) {
      const password = generatePassword()

      expect(password).toMatch(SHAPE)
      expect(password.replace(/-/g, '').length).toBeGreaterThanOrEqual(
        MINIMUM_LENGTH,
      )
    }
  })

  it('écarte les caractères qu’on confond en les dictant', () => {
    const drawn = Array.from({ length: 300 }, () => generatePassword()).join('')

    for (const character of ['0', '1', 'O', 'I', 'l']) {
      expect(drawn).not.toContain(character)
    }
  })

  it('ne se répète pas', () => {
    const drawn = new Set(Array.from({ length: 300 }, () => generatePassword()))

    expect(drawn.size).toBe(300)
  })

  it('passe sa propre vérification', () => {
    for (let draw = 0; draw < 100; draw += 1) {
      expect(checkPassword(generatePassword())).toBeUndefined()
    }
  })
})

describe('checkPassword', () => {
  it('accepte un mot de passe long et varié', () => {
    expect(checkPassword('ruche-gante-vaste-plume')).toBeUndefined()
  })

  it('refuse un mot de passe trop court en disant la longueur attendue', () => {
    expect(checkPassword('court1!')).toContain(String(MINIMUM_LENGTH))
  })

  it('refuse un mot de passe qui ne varie presque pas', () => {
    expect(checkPassword('ababababababab')).toBeDefined()
  })

  it('refuse les plus courants, quelle que soit leur décoration', () => {
    for (const password of [
      'motdepasse123',
      'Motdepasse!!',
      'P@ssw0rd1234',
      'AZERTYUIOP12',
      'administrateur',
      'chocolat2026',
    ]) {
      expect(checkPassword(password)).toBeDefined()
    }
  })
})

describe('hachage', () => {
  it('produit un condensat Argon2id aux paramètres attendus', async () => {
    const hashed = await hashPassword('ruche-gante-vaste-plume')

    expect(hashed.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true)
  })

  it('sale : deux hachages du même mot de passe diffèrent', async () => {
    const once = await hashPassword('ruche-gante-vaste-plume')
    const again = await hashPassword('ruche-gante-vaste-plume')

    expect(once).not.toBe(again)
  })

  it('vérifie le bon mot de passe et refuse les autres', async () => {
    const hashed = await hashPassword('ruche-gante-vaste-plume')

    expect(await verifyPassword(hashed, 'ruche-gante-vaste-plume')).toBe(true)
    expect(await verifyPassword(hashed, 'ruche-gante-vaste-plum')).toBe(false)
    expect(await verifyPassword(hashed, '')).toBe(false)
  })

  it('rend faux sur un condensat abîmé, sans lever', async () => {
    expect(await verifyPassword('pas un condensat', 'x')).toBe(false)
    expect(await verifyPassword('', 'x')).toBe(false)
  })

  it('brûle le même temps qu’une vérification réelle', async () => {
    const hashed = await hashPassword('ruche-gante-vaste-plume')

    const real = await measure(() => verifyPassword(hashed, 'faux'))
    const decoy = await measure(() => burnTime('faux'))

    expect(decoy).toBeGreaterThan(real / 4)
  })
})

async function measure(work: () => Promise<unknown>): Promise<number> {
  const start = performance.now()

  await work()

  return performance.now() - start
}
