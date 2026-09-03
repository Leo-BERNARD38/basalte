// Le serveur du panel, ouvert une fois pour le processus. La base SQLite et le
// canal email ne dépendent que du dépôt, qui ne bouge pas : les rouvrir à
// chaque requête ne servirait qu’à multiplier les descripteurs de fichier.
//
// La file de mise en ligne l’est pour la même raison, en plus forte : deux
// files donneraient deux builds simultanés, et la place unique ne vaudrait
// plus rien. La purge, elle, est un minuteur : un seul, posé ici.
//
// Les schémas, eux, viennent du module généré au démarrage : le panel ne
// reparcourt pas les blocs. Seul le manifeste des médias est relu à chaque
// requête, parce que le panel lui-même l’écrit.
//
// Sous `astro dev`, Vite réévalue ce module chaque fois qu’un bloc ou un
// contenu change — le module généré est dans son graphe. Ce qui n’a de sens
// qu’une fois par processus — la base, le minuteur, la file — survit donc à la
// réévaluation sur `globalThis`, par dépôt ; les schémas, eux, sont relus à
// chaque fois, et c’est précisément ce qu’on veut. En production, le module
// n’est évalué qu’une fois et le partage ne change rien.

import {
  chromeRegistry,
  dev,
  journalRegistry,
  registry,
  root,
  site,
} from 'virtual:basalte'

import { accessLogPath } from '../analytics/access.js'
import type { Schemas } from '../content/project.js'
import { readDocuments } from '../media/documents.js'
import { readManifest } from '../media/manifest.js'
import { alertMaintainer } from '../publish/alert.js'
import { createPublisher, publishIfStale } from '../publish/publish.js'
import { discardStalePartials, siteRoot } from '../publish/release.js'
import type { Panel } from '../server/context.js'
import { adminAddress, contactAddress } from '../server/email/provider.js'
import { openServer, siteProvider } from '../server/open.js'
import { DEFAULT_MONTHS, startPurge } from '../server/purge.js'
import {
  webhookNotifier,
  webhookUrl,
  type Notifier,
} from '../server/webhook.js'

type Shared = {
  readonly server: ReturnType<typeof openServer>
  readonly provider: ReturnType<typeof siteProvider>
  readonly publisher: ReturnType<typeof createPublisher>
  readonly notifier: Notifier | undefined
  readonly months: number
}

const SHARED = Symbol.for('basalte.panel')

let opened: Panel | undefined

export function panelContext(): Panel {
  opened ??= open()

  return opened
}

function open(): Panel {
  const { server, provider, publisher, notifier, months } = shared()

  return {
    server,
    root,
    dev,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      chrome: chromeRegistry,
      journal: journalRegistry,
      media: await readManifest(root),
      documents: await readDocuments(root),
    }),
    publisher,
    leads: {
      notify: site.capabilities.notifyLeads,
      to: contactAddress(process.env),
      provider,
      notifier,
      months,
    },
    accessLog: accessLogPath(process.env),
    support: adminAddress(process.env),
  }
}

function shared(): Shared {
  const globals = globalThis as { [SHARED]?: Map<string, Shared> }
  const entries = (globals[SHARED] ??= new Map())
  const existing = entries.get(root)

  if (existing !== undefined) return existing

  const created = openShared()

  entries.set(root, created)

  return created
}

function openShared(): Shared {
  // `openServer` charge le `.env` du dépôt : rien ne doit lire l’environnement
  // avant lui.
  const server = openServer(root, site)
  const provider = siteProvider(site, process.env)
  const months = site.leads?.purgeAfterMonths ?? DEFAULT_MONTHS
  const notifier = openNotifier()

  startPurge({ database: server.database, months, now: server.now })

  const target = {
    root,
    site: site.name,
    database: server.database,
    now: server.now,
    alert: alertMaintainer({ to: adminAddress(process.env), provider }),
  }

  const publisher = createPublisher(target)

  // Un build tué laisse son dossier derrière lui, et la purge ne le voit pas.
  // Ici, aucun build ne tourne encore : tout `.partial` est un orphelin.
  void discardStalePartials(siteRoot(root)).catch(() => undefined)

  // Le site sort de lui-même quand il ne correspond plus au dépôt : premier
  // déploiement, machine mise à jour, ou reprise sur une machine neuve. Jamais
  // sous `astro dev`, que le module généré signale.
  void publishIfStale(target, publisher, dev).catch((cause: Error) => {
    process.stderr.write(
      `La publication au démarrage a échoué : ${cause.message}\n`,
    )
  })

  return { server, provider, publisher, notifier, months }
}

// Une adresse mal écrite ne doit pas empêcher le site de servir : elle se dit
// sur la sortie d’erreur, et les messages continuent d’arriver au panel.
// `basalte doctor` la reprend et la nomme.
function openNotifier(): Notifier | undefined {
  const url = webhookUrl(process.env)

  if (url === '') return undefined

  try {
    return webhookNotifier(url)
  } catch (cause) {
    process.stderr.write(
      `L’adresse de notification est ignorée : ${(cause as Error).message}\n`,
    )

    return undefined
  }
}
