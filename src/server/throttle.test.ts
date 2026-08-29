import { describe, expect, it } from 'vitest'

import { MEMORY, openDatabase } from './database.js'
import { MINUTE } from './durations.js'
import { consume, pruneThrottle, RULES, type Rule } from './throttle.js'

const RULE: Rule = { limit: 3, window: 15 * MINUTE }
const START = Date.UTC(2026, 7, 29, 9, 0, 0)

describe('consume', () => {
  it('laisse passer jusqu’à la limite, puis refuse', () => {
    const database = openDatabase(MEMORY)

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      expect(consume(database, 'test', 'clé', RULE, START).allowed).toBe(true)
    }

    expect(consume(database, 'test', 'clé', RULE, START).allowed).toBe(false)

    database.close()
  })

  it('dit quand la fenêtre se referme', () => {
    const database = openDatabase(MEMORY)
    const inside = START + 3 * MINUTE

    expect(consume(database, 'test', 'clé', RULE, inside).retryAt).toBe(
      Math.floor(inside / RULE.window) * RULE.window + RULE.window,
    )

    database.close()
  })

  it('repart à zéro à la fenêtre suivante', () => {
    const database = openDatabase(MEMORY)

    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      consume(database, 'test', 'clé', RULE, START)
    }

    expect(consume(database, 'test', 'clé', RULE, START).allowed).toBe(false)
    expect(
      consume(database, 'test', 'clé', RULE, START + RULE.window).allowed,
    ).toBe(true)

    database.close()
  })

  it('compte chaque clé et chaque seau séparément', () => {
    const database = openDatabase(MEMORY)

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      consume(database, 'test', 'une', RULE, START)
    }

    expect(consume(database, 'test', 'une', RULE, START).allowed).toBe(false)
    expect(consume(database, 'test', 'autre', RULE, START).allowed).toBe(true)
    expect(consume(database, 'ailleurs', 'une', RULE, START).allowed).toBe(true)

    database.close()
  })

  it('ne consomme rien quand il refuse', () => {
    const database = openDatabase(MEMORY)

    for (let attempt = 0; attempt < RULE.limit + 5; attempt += 1) {
      consume(database, 'test', 'clé', RULE, START)
    }

    const row = database
      .prepare('select count from throttle where key = ?')
      .get('clé')

    expect(row?.['count']).toBe(RULE.limit)

    database.close()
  })
})

describe('RULES', () => {
  it('tient les chiffres annoncés par panel.md', () => {
    expect(RULES.code).toEqual({ limit: 3, window: 15 * MINUTE })
    expect(RULES.account.limit).toBeLessThan(RULES.address.limit)
  })
})

describe('pruneThrottle', () => {
  it('efface les fenêtres révolues et garde la courante', () => {
    const database = openDatabase(MEMORY)

    consume(database, 'test', 'clé', RULE, START)
    consume(database, 'test', 'clé', RULE, START + RULE.window)

    pruneThrottle(database, START + RULE.window)

    expect(
      database.prepare('select count(*) as total from throttle').get()?.[
        'total'
      ],
    ).toBe(1)

    database.close()
  })
})
