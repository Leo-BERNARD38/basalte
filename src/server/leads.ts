// Les messages reçus par le formulaire de contact.
//
// Un message est écrit en base **avant** toute tentative d’envoi. Un incident
// chez le fournisseur d’email, un classement en spam, une clé expirée : rien
// de tout cela ne doit faire perdre un lead, qui coûte plus cher que le reste
// du site réuni. L’envoi n’est donc qu’une notification, jamais le stockage.
//
// D’où la valeur par défaut de `delivery` : un message est « non transmis »
// tant que le fournisseur n’a pas confirmé. Un processus tué au milieu d’un
// envoi laisse une ligne qui dit vrai, et le client la lit quand même.
//
// Ce sont des données personnelles : elles s’effacent d’elles-mêmes au bout de
// la durée configurée (`purge.ts`), et le client peut en supprimer une à la
// main depuis le panel.

import type { DatabaseSync } from 'node:sqlite'

import { maybeNumber, number, text, type Row } from './database.js'

/** Ce qu’est devenue la notification par email. */
export type Delivery = 'sent' | 'failed'

export type Lead = {
  readonly id: number
  readonly at: number
  readonly name: string
  readonly email: string
  readonly message: string
  /** La page depuis laquelle le message est parti. */
  readonly page: string
  readonly language: string
  readonly ip: string
  readonly agent: string
  readonly delivery: Delivery
  readonly readAt?: number
}

export type NewLead = Omit<Lead, 'id' | 'delivery' | 'readAt'>

export function recordLead(database: DatabaseSync, lead: NewLead): number {
  const result = database
    .prepare(
      `insert into lead (at, name, email, message, page, language, ip, agent)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      lead.at,
      lead.name,
      lead.email,
      lead.message,
      lead.page,
      lead.language,
      lead.ip,
      lead.agent,
    )

  return Number(result.lastInsertRowid)
}

/** Note que la notification est bien partie. */
export function markDelivered(database: DatabaseSync, id: number): void {
  database.prepare('update lead set delivery = ? where id = ?').run('sent', id)
}

export function listLeads(
  database: DatabaseSync,
  limit: number,
): readonly Lead[] {
  return database
    .prepare('select * from lead order by at desc, id desc limit ?')
    .all(limit)
    .map((row) => toLead(row))
}

export function countUnread(database: DatabaseSync): number {
  const row: Row | undefined = database
    .prepare('select count(*) as total from lead where read_at is null')
    .get()

  return row === undefined ? 0 : number(row, 'total')
}

/**
 * Marque un message lu, et rend `false` s’il n’existe pas. Marquer deux fois
 * n’avance pas la date : le panel dit ainsi « message inconnu » sans confondre
 * ce cas avec un message déjà lu.
 */
export function markLeadRead(
  database: DatabaseSync,
  id: number,
  now: number,
): boolean {
  const result = database
    .prepare('update lead set read_at = coalesce(read_at, ?) where id = ?')
    .run(now, id)

  return Number(result.changes) > 0
}

export function deleteLead(database: DatabaseSync, id: number): boolean {
  return (
    Number(database.prepare('delete from lead where id = ?').run(id).changes) >
    0
  )
}

export function purgeLeads(database: DatabaseSync, before: number): number {
  return Number(
    database.prepare('delete from lead where at < ?').run(before).changes,
  )
}

function toLead(row: Row): Lead {
  const readAt = maybeNumber(row, 'read_at')

  return {
    id: number(row, 'id'),
    at: number(row, 'at'),
    name: text(row, 'name'),
    email: text(row, 'email'),
    message: text(row, 'message'),
    page: text(row, 'page'),
    language: text(row, 'language'),
    ip: text(row, 'ip'),
    agent: text(row, 'agent'),
    delivery: text(row, 'delivery') as Delivery,
    ...(readAt === undefined ? {} : { readAt }),
  }
}
