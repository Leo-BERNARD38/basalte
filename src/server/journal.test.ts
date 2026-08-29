import { describe, expect, it } from 'vitest'

import { createAccount } from './account.js'
import { ELSEWHERE, HERE, START } from './auth.fixture.js'
import { MEMORY, openDatabase } from './database.js'
import { DAY } from './durations.js'
import {
  countSince,
  OUTCOME_LABELS,
  purgeJournal,
  recentEntries,
  record,
  type Outcome,
} from './journal.js'

async function bench() {
  const database = openDatabase(MEMORY)
  const { account } = await createAccount(database, 'a@exemple.fr', START)

  return { database, account }
}

function entry(at: number, outcome: Outcome, accountId?: number) {
  return {
    ...(accountId === undefined ? {} : { accountId }),
    email: 'a@exemple.fr',
    at,
    outcome,
    ip: HERE.ip,
    agent: HERE.agent,
  }
}

describe('OUTCOME_LABELS', () => {
  it('donne un libellé français à chaque issue', () => {
    for (const [outcome, label] of Object.entries(OUTCOME_LABELS)) {
      expect(label).not.toBe('')
      expect(label).not.toBe(outcome)
    }
  })
})

describe('recentEntries', () => {
  it('rend les plus récentes d’abord, jusqu’à la limite', async () => {
    const { database, account } = await bench()

    for (let day = 0; day < 5; day += 1) {
      record(database, entry(START + day * DAY, 'signed-in', account.id))
    }

    const entries = recentEntries(database, account.id, 3)

    expect(entries).toHaveLength(3)
    expect(entries.map((found) => found.at)).toEqual([
      START + 4 * DAY,
      START + 3 * DAY,
      START + 2 * DAY,
    ])

    database.close()
  })

  it('ne mélange pas les comptes', async () => {
    const { database, account } = await bench()
    const other = await createAccount(database, 'b@exemple.fr', START)

    record(database, entry(START, 'signed-in', account.id))
    record(database, entry(START, 'signed-in', other.account.id))

    expect(recentEntries(database, account.id, 10)).toHaveLength(1)

    database.close()
  })

  it('rend l’origine telle qu’elle a été enregistrée', async () => {
    const { database, account } = await bench()

    record(database, {
      ...entry(START, 'signed-in', account.id),
      ip: ELSEWHERE.ip,
      agent: ELSEWHERE.agent,
    })

    const found = recentEntries(database, account.id, 1)[0]

    expect(found?.ip).toBe(ELSEWHERE.ip)
    expect(found?.agent).toBe(ELSEWHERE.agent)

    database.close()
  })
})

describe('countSince', () => {
  it('ne compte que l’issue demandée, dans la fenêtre demandée', async () => {
    const { database, account } = await bench()

    record(database, entry(START, 'password-rejected', account.id))
    record(database, entry(START + DAY, 'password-rejected', account.id))
    record(database, entry(START + DAY, 'signed-in', account.id))

    expect(countSince(database, account.id, 'password-rejected', START)).toBe(2)
    expect(
      countSince(database, account.id, 'password-rejected', START + DAY),
    ).toBe(1)
    expect(countSince(database, account.id, 'locked', START)).toBe(0)

    database.close()
  })
})

describe('purgeJournal', () => {
  it('efface ce qui a dépassé la durée de conservation', async () => {
    const { database, account } = await bench()

    record(database, entry(START, 'signed-in', account.id))
    record(database, entry(START + 400 * DAY, 'signed-in', account.id))

    expect(purgeJournal(database, START + 365 * DAY)).toBe(1)
    expect(recentEntries(database, account.id, 10)).toHaveLength(1)

    database.close()
  })

  it('garde les entrées qui n’ont pas de compte rattaché', async () => {
    const { database } = await bench()

    record(database, entry(START + DAY, 'password-rejected'))

    expect(purgeJournal(database, START)).toBe(0)

    database.close()
  })
})
