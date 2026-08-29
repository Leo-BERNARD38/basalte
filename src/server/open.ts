// Le serveur d’un dépôt, monté depuis ce que le dépôt contient déjà : sa
// configuration versionnée pour l’identité du site, son `.env` pour la clé
// d’email, et son fichier SQLite pour le reste.
//
// Sans clé d’email, le canal bascule sur le fournisseur « console » : le flux
// de connexion se déroule entièrement en local, le code s’affiche dans le
// terminal, et rien ne part sur le réseau.

import type { Site } from '../site/define.js'
import { createServer, type Server } from './context.js'
import { databasePath, openDatabase } from './database.js'
import { brevoProvider } from './email/brevo.js'
import { consoleProvider } from './email/console.js'
import {
  describeMissing,
  readSettings,
  type EmailProvider,
  type Environment,
} from './email/provider.js'

const LOCAL = 'En attendant, les emails s’affichent dans le terminal.'

export function openServer(
  root: string,
  site: Site,
  environment: Environment = process.env,
): Server {
  return createServer({
    database: openDatabase(databasePath(root)),
    site: { name: site.name, origin: `https://${site.domain}` },
    email: authProvider(site, environment),
  })
}

export function authProvider(
  site: Site,
  environment: Environment,
): EmailProvider {
  const auth = readSettings(
    environment,
    site.email?.provider ?? 'brevo',
    site.name,
  )

  const missing = describeMissing(auth)

  if (missing !== undefined) {
    process.stderr.write([missing, LOCAL, ''].join('\n'))

    return consoleProvider()
  }

  if (auth.provider !== 'brevo') {
    throw new Error(
      `Fournisseur d’email inconnu : « ${auth.provider} ». Attendu « brevo ».`,
    )
  }

  return brevoProvider(auth)
}
