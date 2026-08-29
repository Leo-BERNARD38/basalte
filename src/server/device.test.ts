import { describe, expect, it } from 'vitest'

import { createAccount } from './account.js'
import { ELSEWHERE, HERE, START } from './auth.fixture.js'
import { MEMORY, openDatabase } from './database.js'
import {
  findDevice,
  forgetDevices,
  listDevices,
  trustDevice,
  TRUST,
} from './device.js'
import { DAY } from './durations.js'
import { fingerprint } from './secrets.js'

async function bench() {
  const database = openDatabase(MEMORY)
  const { account } = await createAccount(database, 'a@exemple.fr', START)

  return { database, account }
}

describe('trustDevice', () => {
  it('fait confiance trente jours, et pas un de plus', async () => {
    const { database, account } = await bench()
    const { token, expiresAt } = trustDevice(database, account.id, HERE, START)

    expect(expiresAt).toBe(START + TRUST)
    expect(TRUST).toBe(30 * DAY)
    expect(findDevice(database, token, START + TRUST - 1)).toBeDefined()
    expect(findDevice(database, token, START + TRUST)).toBeUndefined()

    database.close()
  })

  it('ne garde que l’empreinte du jeton', async () => {
    const { database, account } = await bench()
    const { token } = trustDevice(database, account.id, HERE, START)

    expect(
      database.prepare('select token_hash from device').get()?.['token_hash'],
    ).toBe(fingerprint(token))

    database.close()
  })
})

describe('findDevice', () => {
  it('ne reconnaît pas un jeton inventé', async () => {
    const { database, account } = await bench()

    trustDevice(database, account.id, HERE, START)

    expect(findDevice(database, 'jeton-inventé', START)).toBeUndefined()

    database.close()
  })
})

describe('listDevices', () => {
  it('liste les appareils encore valables, du plus récent au plus ancien', async () => {
    const { database, account } = await bench()

    trustDevice(database, account.id, HERE, START)
    trustDevice(database, account.id, ELSEWHERE, START + DAY)

    const devices = listDevices(database, account.id, START + DAY)

    expect(devices.map((device) => device.agent)).toEqual([
      ELSEWHERE.agent,
      HERE.agent,
    ])

    database.close()
  })

  it('n’en liste plus aucun une fois la confiance écoulée', async () => {
    const { database, account } = await bench()

    trustDevice(database, account.id, HERE, START)

    expect(listDevices(database, account.id, START + TRUST)).toHaveLength(0)

    database.close()
  })
})

describe('forgetDevices', () => {
  it('oublie tous les appareils d’un compte d’un seul geste', async () => {
    const { database, account } = await bench()
    const first = trustDevice(database, account.id, HERE, START)
    const second = trustDevice(database, account.id, ELSEWHERE, START)

    expect(forgetDevices(database, account.id, START)).toBe(2)
    expect(findDevice(database, first.token, START)).toBeUndefined()
    expect(findDevice(database, second.token, START)).toBeUndefined()
    expect(forgetDevices(database, account.id, START)).toBe(0)

    database.close()
  })
})
