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
//
// Et c’est elle, enfin, qui repose un mot de passe oublié : le panel n’en
// change un qu’en demandant l’actuel, ce dont un client qui l’a perdu est
// justement incapable.

import { createAccount, findAccount, resetPassword } from '../server/account.js'
import type { Server } from '../server/context.js'
import { forgetDevices } from '../server/device.js'
import { MINUTE } from '../server/durations.js'
import { RESCUE_PATH } from '../server/handlers.js'
import { createRescue, RESCUE_LIFETIME } from '../server/login.js'
import { record } from '../server/journal.js'
import { openServer } from '../server/open.js'
import { revokeSessions } from '../server/session.js'
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

  const create = argv.includes('--create')
  const reset = argv.includes('--reset')

  // Les arguments se refusent avant que la configuration ne se charge : une
  // ligne de commande fautive n’a pas à dépendre d’un dépôt lisible.
  if (create && reset) {
    return fails([
      '« --create » crée un compte, « --reset » repose le mot de passe d’un',
      'compte qui existe : les deux ensemble ne veulent rien dire.',
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
    return await issueRescue(server, origin, email, mode(create, reset))
  } finally {
    server.database.close()
  }
}

function mode(create: boolean, reset: boolean): Mode {
  if (create) return 'create'

  return reset ? 'reset' : 'none'
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

/** Ce que la commande fait du compte avant d’ouvrir le lien. */
export type Mode = 'none' | 'create' | 'reset'

/** Le cœur de la commande, sans disque ni configuration à charger. */
export async function issueRescue(
  server: Server,
  origin: string,
  email: string,
  mode: Mode,
): Promise<Result> {
  const lines = [...heading('admin:login', server.site.name)]

  if (mode === 'create') {
    const created = await createAccount(server.database, email, server.now())

    lines.push(
      line('ok', `compte créé pour « ${created.account.email} »`),
      ...dictated(created.password),
    )
  }

  if (mode === 'reset') {
    lines.push(...(await reissue(server, email)))
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

/**
 * Le mot de passe reposé, et tout ce qui portait l’ancien accès coupé avec
 * lui : sessions ouvertes et appareils reconnus. Une réinitialisation dit que
 * l’accès est à rétablir — le laisser ouvert ailleurs le contredirait.
 */
async function reissue(
  server: Server,
  email: string,
): Promise<readonly string[]> {
  const account = findAccount(server.database, email)

  if (account === undefined) {
    throw new Error(`Aucun compte pour « ${email} ».`)
  }

  const now = server.now()
  const password = await resetPassword(server.database, account, now)
  const closed = revokeSessions(server.database, account.id, now)
  const forgotten = forgetDevices(server.database, account.id, now)

  record(server.database, {
    accountId: account.id,
    email: account.email,
    at: now,
    outcome: 'password-changed',
    ip: 'console',
    agent: 'basalte admin:login --reset',
  })

  return [
    line('ok', `mot de passe reposé pour « ${account.email} »`),
    line(
      'ok',
      `${closed} session(s) fermée(s), ${forgotten} appareil(s) oublié(s)`,
    ),
    ...dictated(password),
  ]
}

// L’alphabet du mot de passe est fait pour être dicté : ni O ni 0, ni l ni 1.
function dictated(password: string): readonly string[] {
  return [
    '',
    `  Mot de passe : ${password}`,
    '',
    '  Il ne s’affichera plus. Note-le, ou transmets-le de vive voix —',
    '  jamais par email, qui porte déjà le second facteur.',
    '',
  ]
}
