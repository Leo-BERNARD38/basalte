// Ce que les fonctions du serveur reçoivent au lieu d’aller le chercher : la
// base, le canal email d’authentification, l’identité du site, et l’horloge.
//
// L’horloge est un paramètre parce que tout ce qui suit est une histoire de
// durées — expirations, fenêtres, verrouillages — et qu’un test qui attend
// vraiment sept jours n’est pas un test.

import type { DatabaseSync } from 'node:sqlite'

import type { Schemas } from '../content/project.js'
import type { Publisher } from '../publish/publish.js'
import type { EmailProvider } from './email/provider.js'
import type { Notifier } from './webhook.js'

export type Server = {
  readonly database: DatabaseSync
  readonly site: SiteIdentity
  readonly email: EmailProvider
  readonly now: () => number
}

// Le panel écrit sur le disque : il lui faut, en plus du serveur, la racine du
// dépôt du site. Il n’écrit jamais ailleurs que dans `content/` et
// `public/media/`.
//
// Les schémas sont fournis plutôt que cherchés : ils sont fixés au démarrage —
// seul le manifeste des médias change sous les pas du panel, et c’est lui qui
// le change.
export type Panel = {
  readonly server: Server
  readonly root: string
  schemas(): Promise<Schemas>
  /** La file de mise en ligne, unique pour le processus (D71). */
  readonly publisher: Publisher
  /** Où partent les messages du formulaire, et combien de temps ils vivent. */
  readonly leads: Leads
  /** Le log d’accès de Caddy, d’où sort le rapport d’audience. */
  readonly accessLog: string
  /** À qui le client s’adresse quand quelque chose casse. Vide, rien ne le dit. */
  readonly support: string
}

// Deux canaux indépendants, et le canal du site — pas celui des codes de
// connexion (D75). Sans destinataire, sans fournisseur, ou sans la capacité qui
// l’autorise, un message reste dans le panel : il n’est jamais perdu, il n’est
// simplement pas notifié.
//
// L’adresse de notification, elle, ne dépend d’aucune capacité : elle vaut par
// sa seule présence, comme le destinataire vaut par la sienne. Un site qui a
// coupé l’email et déclaré une adresse est prévenu — c’est même le cas que la
// phase 11 vise.
export type Leads = {
  /** Ce que le site déclare : à `false`, aucun message ne part par email. */
  readonly notify: boolean
  readonly to: string
  readonly provider?: EmailProvider | undefined
  /** L’adresse web prévenue à chaque message, quand le `.env` en donne une. */
  readonly notifier?: Notifier | undefined
  /** Durée de conservation, en mois. */
  readonly months: number
}

export type SiteIdentity = {
  readonly name: string
  /** Origine publique du site, par exemple `https://exemple.fr`. */
  readonly origin: string
}

export function createServer(parts: {
  readonly database: DatabaseSync
  readonly site: SiteIdentity
  readonly email: EmailProvider
  readonly now?: () => number
}): Server {
  return {
    database: parts.database,
    site: parts.site,
    email: parts.email,
    now: parts.now ?? (() => Date.now()),
  }
}
