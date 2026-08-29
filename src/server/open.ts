// Le serveur d’un dépôt, monté depuis ce que le dépôt contient déjà : sa
// configuration versionnée pour l’identité du site, son `.env` pour la clé
// d’email, et son fichier SQLite pour le reste.
//
// Sans clé d’email, le canal bascule sur le fournisseur « console » : le flux
// de connexion se déroule entièrement en local, le code s’affiche dans le
// terminal, et rien ne part sur le réseau.

import { existsSync } from 'node:fs'
import path from 'node:path'

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

const BREVO = 'brevo'

const LOCAL = 'En attendant, les emails s’affichent dans le terminal.'
const ENV_FILE = '.env'

export function openServer(
  root: string,
  site: Site,
  environment: Environment = process.env,
): Server {
  loadEnvironment(root)

  return createServer({
    database: openDatabase(databasePath(root)),
    site: { name: site.name, origin: `https://${site.domain}` },
    email: authProvider(site, environment),
  })
}

/** Charge le `.env` du dépôt s’il existe ; il n’écrase aucune variable posée. */
export function loadEnvironment(root: string): void {
  const file = path.join(root, ENV_FILE)

  if (existsSync(file)) process.loadEnvFile(file)
}

export function authProvider(
  site: Site,
  environment: Environment,
): EmailProvider {
  const auth = readSettings(
    environment,
    site.email?.provider ?? BREVO,
    site.name,
  )

  const missing = describeMissing(auth)

  if (missing !== undefined) {
    process.stderr.write([missing, LOCAL, ''].join('\n'))

    return consoleProvider()
  }

  if (auth.provider !== BREVO) {
    throw new Error(
      `Fournisseur d’email inconnu : « ${auth.provider} ». Attendu « ${BREVO} ».`,
    )
  }

  return brevoProvider(auth)
}

/**
 * Le canal du site — celui des alertes au mainteneur, et du formulaire de
 * contact à venir. Absent tant qu’il n’est pas configuré : une alerte se dit
 * alors sur la sortie d’erreur, sans jamais emprunter le canal des codes de
 * connexion.
 */
export function siteProvider(
  site: Site,
  environment: Environment,
): EmailProvider | undefined {
  const settings = readSettings(
    environment,
    site.email?.provider ?? BREVO,
    site.name,
    'site',
  )

  if (describeMissing(settings) !== undefined) return undefined
  if (settings.provider !== BREVO) return undefined

  return brevoProvider(settings)
}
