// `basalte admin:login` : la voie d’entrée qui ne passe pas par l’email.
//
// L’email étant devenu un composant d’authentification, une boîte en panne
// suffirait à enfermer le client dehors. Cette commande, lancée en SSH sur la
// machine, produit un lien valable dix minutes — et crée le compte sous
// `--create`, en affichant son mot de passe une seule fois, à l’écran, jamais
// par email (invariant 12).
//
// C’est aussi elle qui ouvre le panel d’un dépôt neuf : en local, `/admin`
// demande une session comme en production. Le lien porte alors le domaine de
// la production, qui ne répond pas — d’où `--origin`.

import { createAccount } from '../server/account.js'
import type { Server } from '../server/context.js'
import { MINUTE } from '../server/durations.js'
import { RESCUE_PATH } from '../server/handlers.js'
import { createRescue, RESCUE_LIFETIME } from '../server/login.js'
import { openServer } from '../server/open.js'
import { loadSite } from '../site/load.js'
import { fails, heading, line, optionValue, succeeds } from './args.js'
import type { Result } from './run.js'

export async function adminLogin(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const email = optionValue(argv, '--user')

  if (email === undefined) {
    return fails([
      'Il manque l’adresse du compte : basalte admin:login --user <email>',
    ])
  }

  const asked = optionValue(argv, '--origin')
  const site = await loadSite(cwd)
  const origin = rescueOrigin(asked, site.domain)

  if (origin === undefined) {
    return fails([
      `« ${asked} » n’est pas une adresse : attendu « http://localhost:4321 ».`,
    ])
  }

  const server = openServer(cwd, site)

  try {
    return await issueRescue(server, origin, email, argv.includes('--create'))
  } finally {
    server.database.close()
  }
}

const ORIGIN = /^https?:\/\/[^/?#\s]+$/

/**
 * L’adresse d’où le lien s’ouvre. Sans `--origin`, le domaine du site — ce
 * qu’il faut sur la machine, où la commande est faite pour tourner. Sous
 * `npm run dev`, ce domaine est celui de la production et ne répond pas : le
 * lien s’ouvrirait ailleurs, ou nulle part. Rend `undefined` quand ce qui est
 * demandé n’est pas une adresse.
 */
export function rescueOrigin(
  asked: string | undefined,
  domain: string,
): string | undefined {
  if (asked === undefined) return `https://${domain}`

  const trimmed = asked.replace(/\/+$/, '')

  return ORIGIN.test(trimmed) ? trimmed : undefined
}

/** Le cœur de la commande, sans disque ni configuration à charger. */
export async function issueRescue(
  server: Server,
  origin: string,
  email: string,
  create: boolean,
): Promise<Result> {
  const lines = [...heading('admin:login', server.site.name)]

  if (create) {
    const created = await createAccount(server.database, email, server.now())

    lines.push(
      line('ok', `compte créé pour « ${created.account.email} »`),
      '',
      `  Mot de passe : ${created.password}`,
      '',
      '  Il ne s’affichera plus. Note-le, ou transmets-le de vive voix —',
      '  jamais par email, qui porte déjà le second facteur.',
      '',
    )
  }

  const rescue = createRescue(server, email)

  lines.push(
    `  Lien de connexion, valable ${Math.round(RESCUE_LIFETIME / MINUTE)} minutes et à usage unique :`,
    '',
    `  ${origin}${RESCUE_PATH}?token=${rescue.token}`,
    '',
  )

  return succeeds(lines)
}
