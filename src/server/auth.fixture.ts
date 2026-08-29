// Le banc d’essai de l’authentification : une base en mémoire, un canal email
// qui retient au lieu d’envoyer, et une horloge qu’on avance à la main.
//
// Il ne part pas dans le paquet — `tsconfig.build.json` écarte les `.fixture`
// au même titre que les tests.

import { createAccount, type Account } from './account.js'
import { createServer, type Server } from './context.js'
import { MEMORY, openDatabase } from './database.js'
import { memoryProvider, type MemoryProvider } from './email/memory.js'
import { CODE_DIGITS } from './secrets.js'
import type { Origin } from './session.js'

export const START = Date.UTC(2026, 7, 29, 9, 0, 0)
export const EMAIL = 'client@exemple.fr'
export const PASSWORD = 'ruche-gante-vaste-plume'
export const HERE: Origin = { ip: '203.0.113.7', agent: 'Firefox/142.0' }
export const ELSEWHERE: Origin = { ip: '198.51.100.4', agent: 'Chrome/141.0' }

export type Harness = {
  readonly server: Server
  readonly email: MemoryProvider
  /** Avance l’horloge de `milliseconds`, et renvoie la nouvelle date. */
  travel(milliseconds: number): number
  /** Le dernier code à six chiffres réellement expédié. */
  code(): string
  account(): Account
  close(): void
}

export async function harness(
  options: { readonly account?: boolean } = {},
): Promise<Harness> {
  const database = openDatabase(MEMORY)
  const email = memoryProvider()
  let clock = START

  const server = createServer({
    database,
    email,
    site: { name: 'Atelier Démonstration', origin: 'https://exemple.fr' },
    now: () => clock,
  })

  let account: Account | undefined

  if (options.account !== false) {
    account = (await createAccount(database, EMAIL, clock, PASSWORD)).account
  }

  return {
    server,
    email,

    travel(milliseconds) {
      clock += milliseconds

      return clock
    },

    code() {
      const found = email
        .last()
        ?.text.match(new RegExp(`\\b\\d{${CODE_DIGITS}}\\b`))

      if (found === null || found === undefined) {
        throw new Error('Aucun code dans le dernier email.')
      }

      return found[0]
    },

    account() {
      if (account === undefined) throw new Error('Aucun compte sur ce banc.')

      return account
    },

    close() {
      database.close()
    },
  }
}
