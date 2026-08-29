// Ce que les fonctions du serveur reçoivent au lieu d’aller le chercher : la
// base, le canal email d’authentification, l’identité du site, et l’horloge.
//
// L’horloge est un paramètre parce que tout ce qui suit est une histoire de
// durées — expirations, fenêtres, verrouillages — et qu’un test qui attend
// vraiment sept jours n’est pas un test.

import type { DatabaseSync } from 'node:sqlite'

import type { EmailProvider } from './email/provider.js'

export type Server = {
  readonly database: DatabaseSync
  readonly site: SiteIdentity
  readonly email: EmailProvider
  readonly now: () => number
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
