// `basalte admin:login` : la voie d’entrée qui ne passe pas par l’email.
//
// L’email étant devenu un composant d’authentification, une boîte en panne
// suffirait à enfermer le client dehors. Cette commande, lancée en SSH sur la
// machine, produit un lien valable dix minutes — et crée le compte sous
// `--create`, en affichant son mot de passe une seule fois, à l’écran, jamais
// par email (invariant 12).

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

  const site = await loadSite(cwd)
  const server = openServer(cwd, site)

  try {
    return await issueRescue(
      server,
      site.domain,
      email,
      argv.includes('--create'),
    )
  } finally {
    server.database.close()
  }
}

/** Le cœur de la commande, sans disque ni configuration à charger. */
export async function issueRescue(
  server: Server,
  domain: string,
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
    `  https://${domain}${RESCUE_PATH}?token=${rescue.token}`,
    '',
  )

  return succeeds(lines)
}
