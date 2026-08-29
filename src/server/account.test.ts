import { describe, expect, it } from 'vitest'

import {
  accountById,
  changePassword,
  clearFailures,
  createAccount,
  findAccount,
  LOCK_AFTER,
  LOCK_STEPS,
  normalizeEmail,
  registerFailure,
} from './account.js'
import { MEMORY, openDatabase } from './database.js'
import { HOUR } from './durations.js'
import { verifyPassword } from './password.js'

const START = Date.UTC(2026, 7, 29, 9, 0, 0)

describe('normalizeEmail', () => {
  it('rogne et abaisse la casse', () => {
    expect(normalizeEmail('  Client@Exemple.FR ')).toBe('client@exemple.fr')
  })
})

describe('createAccount', () => {
  it('génère le mot de passe quand on ne lui en donne pas', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'a@exemple.fr', START)

    expect(created.password).toMatch(/^\S+$/)
    expect(
      await verifyPassword(created.account.passwordHash, created.password),
    ).toBe(true)

    database.close()
  })

  it('ne stocke jamais le mot de passe en clair', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'a@exemple.fr', START)

    expect(created.account.passwordHash).not.toContain(created.password)
    expect(created.account.passwordHash.startsWith('$argon2id$')).toBe(true)

    database.close()
  })

  it('refuse une adresse déjà prise, quelle que soit sa casse', async () => {
    const database = openDatabase(MEMORY)

    await createAccount(database, 'a@exemple.fr', START)

    await expect(
      createAccount(database, 'A@Exemple.fr', START),
    ).rejects.toThrow('existe déjà')

    database.close()
  })

  it('refuse ce qui n’est pas une adresse', async () => {
    const database = openDatabase(MEMORY)

    await expect(
      createAccount(database, 'pas-une-adresse', START),
    ).rejects.toThrow('adresse email')

    database.close()
  })

  it('refuse un mot de passe imposé trop faible', async () => {
    const database = openDatabase(MEMORY)

    await expect(
      createAccount(database, 'a@exemple.fr', START, 'motdepasse123'),
    ).rejects.toThrow('plus utilisés')

    database.close()
  })
})

describe('findAccount', () => {
  it('retrouve par adresse normalisée, et par identifiant', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'A@Exemple.fr', START)

    expect(findAccount(database, ' a@exemple.FR ')?.id).toBe(created.account.id)
    expect(accountById(database, created.account.id)?.email).toBe(
      'a@exemple.fr',
    )
    expect(findAccount(database, 'inconnu@exemple.fr')).toBeUndefined()
    expect(accountById(database, 404)).toBeUndefined()

    database.close()
  })
})

describe('changePassword', () => {
  it('remplace le condensat et note la date', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'a@exemple.fr', START)

    await changePassword(
      database,
      created.account,
      created.password,
      'ruche-gante-vaste-plume',
      START + HOUR,
    )

    const after = accountById(database, created.account.id)

    expect(after?.passwordChangedAt).toBe(START + HOUR)
    expect(
      await verifyPassword(
        after?.passwordHash ?? '',
        'ruche-gante-vaste-plume',
      ),
    ).toBe(true)
    expect(
      await verifyPassword(after?.passwordHash ?? '', created.password),
    ).toBe(false)

    database.close()
  })

  it('exige le mot de passe actuel', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'a@exemple.fr', START)

    await expect(
      changePassword(
        database,
        created.account,
        'pas le bon',
        'ruche-gante-vaste-plume',
        START,
      ),
    ).rejects.toThrow('ne correspond pas')

    database.close()
  })

  it('refuse un nouveau mot de passe faible', async () => {
    const database = openDatabase(MEMORY)
    const created = await createAccount(database, 'a@exemple.fr', START)

    await expect(
      changePassword(
        database,
        created.account,
        created.password,
        'court',
        START,
      ),
    ).rejects.toThrow('12 caractères')

    database.close()
  })
})

describe('verrouillage progressif', () => {
  it('ne bloque pas avant le seuil', async () => {
    const database = openDatabase(MEMORY)
    let account = (await createAccount(database, 'a@exemple.fr', START)).account

    for (let failure = 1; failure < LOCK_AFTER; failure += 1) {
      expect(registerFailure(database, account, START)).toBe(0)
      account = accountById(database, account.id) ?? account
    }

    database.close()
  })

  it('allonge le blocage à chaque échec, puis plafonne', async () => {
    const database = openDatabase(MEMORY)
    let account = (await createAccount(database, 'a@exemple.fr', START)).account
    const locks: number[] = []

    for (
      let failure = 0;
      failure < LOCK_AFTER + LOCK_STEPS.length + 2;
      failure += 1
    ) {
      const until = registerFailure(database, account, START)

      account = accountById(database, account.id) ?? account

      if (until > 0) locks.push(until - START)
    }

    expect(locks.slice(0, LOCK_STEPS.length)).toEqual([...LOCK_STEPS])
    expect(locks.at(-1)).toBe(LOCK_STEPS.at(-1))

    database.close()
  })

  it('remet le compteur à zéro à la première réussite', async () => {
    const database = openDatabase(MEMORY)
    let account = (await createAccount(database, 'a@exemple.fr', START)).account

    for (let failure = 0; failure <= LOCK_AFTER; failure += 1) {
      registerFailure(database, account, START)
      account = accountById(database, account.id) ?? account
    }

    expect(account.lockedUntil).toBeGreaterThan(START)

    clearFailures(database, account)
    account = accountById(database, account.id) ?? account

    expect(account.failures).toBe(0)
    expect(account.lockedUntil).toBe(0)

    database.close()
  })
})
