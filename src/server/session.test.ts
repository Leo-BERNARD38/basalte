import { describe, expect, it } from 'vitest'

import { createAccount } from './account.js'
import { HERE, START } from './auth.fixture.js'
import { MEMORY, openDatabase } from './database.js'
import { MINUTE } from './durations.js'
import { fingerprint } from './secrets.js'
import {
  closeSession,
  INACTIVITY,
  LIFETIME,
  openSession,
  pruneSessions,
  readSession,
  revokeOtherSessions,
  revokeSessions,
} from './session.js'

async function bench() {
  const database = openDatabase(MEMORY)
  const { account } = await createAccount(database, 'a@exemple.fr', START)

  return { database, account }
}

describe('openSession', () => {
  it('ne garde en base que l’empreinte du jeton', async () => {
    const { database, account } = await bench()
    const { token } = openSession(database, account.id, HERE, START)

    const stored = database.prepare('select token_hash from session').get()?.[
      'token_hash'
    ]

    expect(stored).toBe(fingerprint(token))
    expect(stored).not.toBe(token)

    database.close()
  })

  it('note l’origine de la connexion', async () => {
    const { database, account } = await bench()

    openSession(database, account.id, HERE, START)

    const row = database.prepare('select ip, agent from session').get()

    expect(row?.['ip']).toBe(HERE.ip)
    expect(row?.['agent']).toBe(HERE.agent)

    database.close()
  })
})

describe('readSession', () => {
  it('rend la session pour un jeton valable, et rien pour un autre', async () => {
    const { database, account } = await bench()
    const { token } = openSession(database, account.id, HERE, START)

    expect(readSession(database, token, START)?.accountId).toBe(account.id)
    expect(readSession(database, 'jeton-inventé', START)).toBeUndefined()

    database.close()
  })

  it('repousse l’inactivité tant qu’on revient', async () => {
    const { database, account } = await bench()
    const { token } = openSession(database, account.id, HERE, START)

    let at = START

    for (let visit = 0; visit < 5; visit += 1) {
      at += INACTIVITY - MINUTE
      expect(readSession(database, token, at)).toBeDefined()
    }

    database.close()
  })

  it('expire après douze heures sans visite', async () => {
    const { database, account } = await bench()
    const { token } = openSession(database, account.id, HERE, START)

    expect(readSession(database, token, START + INACTIVITY - 1)).toBeDefined()
    expect(readSession(database, token, START + INACTIVITY * 2)).toBeUndefined()

    database.close()
  })

  it('expire au bout de sept jours, même en revenant sans cesse', async () => {
    const { database, account } = await bench()
    const { token, expiresAt } = openSession(database, account.id, HERE, START)

    expect(expiresAt).toBe(START + LIFETIME)

    let at = START

    while (at + INACTIVITY - MINUTE < START + LIFETIME) {
      at += INACTIVITY - MINUTE
      expect(readSession(database, token, at)).toBeDefined()
    }

    expect(readSession(database, token, START + LIFETIME)).toBeUndefined()

    database.close()
  })
})

describe('révocation', () => {
  it('ferme une session, et la ferme une seule fois', async () => {
    const { database, account } = await bench()
    const { token } = openSession(database, account.id, HERE, START)

    closeSession(database, token, START + MINUTE)

    expect(readSession(database, token, START + MINUTE)).toBeUndefined()

    closeSession(database, token, START + 2 * MINUTE)

    expect(
      database.prepare('select revoked_at from session').get()?.['revoked_at'],
    ).toBe(START + MINUTE)

    database.close()
  })

  it('coupe toutes les sessions d’un compte d’un coup', async () => {
    const { database, account } = await bench()
    const first = openSession(database, account.id, HERE, START)
    const second = openSession(database, account.id, HERE, START)

    expect(revokeSessions(database, account.id, START)).toBe(2)
    expect(readSession(database, first.token, START)).toBeUndefined()
    expect(readSession(database, second.token, START)).toBeUndefined()

    database.close()
  })
})

describe('revokeOtherSessions', () => {
  it('garde celle qui demande et coupe les autres', async () => {
    const { database, account } = await bench()
    const mine = openSession(database, account.id, HERE, START)
    const other = openSession(database, account.id, HERE, START)

    expect(revokeOtherSessions(database, account.id, mine.token, START)).toBe(1)
    expect(readSession(database, mine.token, START)).toBeDefined()
    expect(readSession(database, other.token, START)).toBeUndefined()

    database.close()
  })
})

describe('pruneSessions', () => {
  it('efface ce qui a dépassé sa date absolue', async () => {
    const { database, account } = await bench()

    openSession(database, account.id, HERE, START)
    pruneSessions(database, START + LIFETIME + 1)

    expect(
      database.prepare('select count(*) as total from session').get()?.[
        'total'
      ],
    ).toBe(0)

    database.close()
  })
})
