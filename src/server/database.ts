// La base du site : comptes, sessions, appareils de confiance, journal, mises
// en ligne, et les messages reçus par le formulaire. Un seul fichier SQLite,
// ouvert par le module `node:sqlite` intégré à Node — le VPS ne reçoit donc
// aucune dépendance native de plus.
//
// Le schéma s’applique par `PRAGMA user_version` : chaque étape est jouée une
// fois, dans l’ordre, et une base déjà à jour ne bouge pas. Une étape ajoutée
// à la suite monte une base existante sans rien lui faire perdre.

import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const DATA_DIR = 'data'
export const DATABASE_FILE = 'basalte.db'
export const MEMORY = ':memory:'

export type Row = Record<string, unknown>

const STEPS: readonly string[] = [
  `
  create table account (
    id integer primary key,
    email text not null unique,
    password_hash text not null,
    created_at integer not null,
    password_changed_at integer not null,
    failures integer not null default 0,
    locked_until integer not null default 0
  ) strict;

  create table login_attempt (
    id integer primary key,
    account_id integer not null references account(id) on delete cascade,
    token_hash text not null unique,
    code_hash text not null,
    created_at integer not null,
    expires_at integer not null,
    consumed_at integer,
    tries integer not null default 0,
    remember integer not null default 0,
    ip text not null,
    agent text not null
  ) strict;

  create table session (
    id integer primary key,
    account_id integer not null references account(id) on delete cascade,
    token_hash text not null unique,
    created_at integer not null,
    seen_at integer not null,
    expires_at integer not null,
    revoked_at integer,
    ip text not null,
    agent text not null
  ) strict;

  create table device (
    id integer primary key,
    account_id integer not null references account(id) on delete cascade,
    token_hash text not null unique,
    created_at integer not null,
    expires_at integer not null,
    revoked_at integer,
    ip text not null,
    agent text not null
  ) strict;

  create table rescue (
    id integer primary key,
    account_id integer not null references account(id) on delete cascade,
    token_hash text not null unique,
    created_at integer not null,
    expires_at integer not null,
    consumed_at integer
  ) strict;

  create table journal (
    id integer primary key,
    account_id integer,
    email text not null,
    at integer not null,
    outcome text not null,
    ip text not null,
    agent text not null
  ) strict;

  create index journal_at on journal (at);

  create table throttle (
    bucket text not null,
    key text not null,
    window_start integer not null,
    count integer not null,
    primary key (bucket, key, window_start)
  ) strict;
  `,
  `
  create table publication (
    id integer primary key,
    account_id integer,
    email text not null,
    at integer not null,
    outcome text not null,
    release text,
    remote text not null default 'absent',
    detail text not null default '',
    duration integer not null default 0
  ) strict;

  create index publication_at on publication (at);
  `,
  `
  create table lead (
    id integer primary key,
    at integer not null,
    name text not null,
    email text not null,
    message text not null,
    page text not null,
    language text not null,
    ip text not null,
    agent text not null,
    delivery text not null default 'failed',
    read_at integer
  ) strict;

  create index lead_at on lead (at);
  `,
]

/** La version que le socle attend : le nombre d’étapes écrites ci-dessus. */
export const SCHEMA_VERSION = STEPS.length

export function databasePath(root: string): string {
  return path.join(root, DATA_DIR, DATABASE_FILE)
}

export function openDatabase(location: string): DatabaseSync {
  if (location !== MEMORY) {
    mkdirSync(path.dirname(location), { recursive: true })
  }

  const database = new DatabaseSync(location, {
    enableForeignKeyConstraints: true,
    timeout: 5000,
  })

  if (location !== MEMORY) database.exec('pragma journal_mode = wal')

  migrate(database)

  return database
}

export function migrate(database: DatabaseSync): void {
  const current = number(
    database.prepare('pragma user_version').get() ?? {},
    'user_version',
  )

  for (let step = current; step < STEPS.length; step += 1) {
    database.exec(STEPS[step] ?? '')
    database.exec(`pragma user_version = ${step + 1}`)
  }
}

// Les lectures de `node:sqlite` arrivent en `Record<string, unknown>` : ces
// trois fonctions sont le seul endroit où une colonne devient une valeur
// typée, et elles échouent bruyamment plutôt que de propager un `undefined`.
export function text(row: Row, name: string): string {
  const value = row[name]

  if (typeof value !== 'string') {
    throw new Error(`La colonne « ${name} » n’est pas un texte.`)
  }

  return value
}

export function number(row: Row, name: string): number {
  const value = row[name]

  if (typeof value !== 'number') {
    throw new Error(`La colonne « ${name} » n’est pas un nombre.`)
  }

  return value
}

export function maybeNumber(row: Row, name: string): number | undefined {
  const value = row[name]

  return typeof value === 'number' ? value : undefined
}
