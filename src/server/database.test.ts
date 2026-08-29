import { describe, expect, it } from 'vitest'

import {
  databasePath,
  maybeNumber,
  MEMORY,
  migrate,
  number,
  openDatabase,
  SCHEMA_VERSION,
  text,
} from './database.js'

function version(database: ReturnType<typeof openDatabase>): number {
  return number(
    database.prepare('pragma user_version').get() ?? {},
    'user_version',
  )
}

describe('openDatabase', () => {
  it('crée les neuf tables du schéma', () => {
    const database = openDatabase(MEMORY)

    const tables = database
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((row) => row['name'])

    for (const table of [
      'account',
      'login_attempt',
      'session',
      'device',
      'rescue',
      'journal',
      'throttle',
      'publication',
      'lead',
    ]) {
      expect(tables).toContain(table)
    }

    database.close()
  })

  it('rejoue une migration déjà appliquée sans rien casser', () => {
    const database = openDatabase(MEMORY)

    migrate(database)
    migrate(database)

    expect(version(database)).toBe(SCHEMA_VERSION)

    database.close()
  })

  it('monte une base restée à une version antérieure sans perdre ses lignes', () => {
    const database = openDatabase(MEMORY)

    database
      .prepare(
        `insert into account (email, password_hash, created_at, password_changed_at)
         values ('client@exemple.fr', 'x', 0, 0)`,
      )
      .run()

    // On rembobine la base à la première étape : les suivantes doivent s’y
    // jouer seules, et ce qui existait déjà rester en place.
    database.exec('drop table lead')
    database.exec('drop table publication')
    database.exec('pragma user_version = 1')

    migrate(database)

    expect(version(database)).toBe(SCHEMA_VERSION)
    expect(
      database.prepare('select count(*) as total from account').get()?.[
        'total'
      ],
    ).toBe(1)

    for (const table of ['publication', 'lead']) {
      expect(
        database.prepare(`select count(*) as total from ${table}`).get()?.[
          'total'
        ],
      ).toBe(0)
    }

    database.close()
  })

  it('fait respecter les clés étrangères', () => {
    const database = openDatabase(MEMORY)

    expect(() =>
      database
        .prepare(
          `insert into session (account_id, token_hash, created_at, seen_at, expires_at, ip, agent)
           values (404, 'x', 0, 0, 0, '', '')`,
        )
        .run(),
    ).toThrow()

    database.close()
  })

  it('refuse une valeur du mauvais type dans une table stricte', () => {
    const database = openDatabase(MEMORY)

    expect(() =>
      database
        .prepare(
          `insert into account (email, password_hash, created_at, password_changed_at)
           values ('a@b.fr', 'h', 'pas un nombre', 0)`,
        )
        .run(),
    ).toThrow()

    database.close()
  })

  it('range le fichier sous data/', () => {
    expect(databasePath('/site').replace(/\\/g, '/')).toBe(
      '/site/data/basalte.db',
    )
  })
})

describe('lecture de colonnes', () => {
  it('nomme la colonne fautive plutôt que de propager un undefined', () => {
    expect(() => text({ a: 1 }, 'a')).toThrow('a')
    expect(() => number({ a: 'x' }, 'a')).toThrow('a')
  })

  it('rend une colonne nulle comme absente', () => {
    expect(maybeNumber({ a: null }, 'a')).toBeUndefined()
    expect(maybeNumber({ a: 3 }, 'a')).toBe(3)
  })
})
