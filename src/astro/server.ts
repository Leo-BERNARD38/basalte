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

import { dev, registry, root, site } from 'virtual:basalte'

import { accessLogPath } from '../analytics/access.js'
import type { Schemas } from '../content/project.js'
import { readDocuments } from '../media/documents.js'
import { readManifest } from '../media/manifest.js'
import { alertMaintainer } from '../publish/alert.js'
import { createPublisher, publishIfStale } from '../publish/publish.js'
import type { Panel } from '../server/context.js'
import { adminAddress, contactAddress } from '../server/email/provider.js'
import { openServer, siteProvider } from '../server/open.js'
import { DEFAULT_MONTHS, startPurge } from '../server/purge.js'

let opened: Panel | undefined

export function panelContext(): Panel {
  opened ??= open()

  return opened
}

function open(): Panel {
  // `openServer` charge le `.env` du dépôt : rien ne doit lire l’environnement
  // avant lui.
  const server = openServer(root, site)
  const provider = siteProvider(site, process.env)
  const months = site.leads?.purgeAfterMonths ?? DEFAULT_MONTHS

  startPurge({ database: server.database, months, now: server.now })

  const target = {
    root,
    site: site.name,
    database: server.database,
    now: server.now,
    alert: alertMaintainer({ to: adminAddress(process.env), provider }),
  }

  const publisher = createPublisher(target)

  // Le site sort de lui-même quand il ne correspond plus au dépôt : premier
  // déploiement, machine mise à jour, ou reprise sur une machine neuve. Jamais
  // sous `astro dev`, que le module généré signale.
  void publishIfStale(target, publisher, dev).catch((cause: Error) => {
    process.stderr.write(
      `La publication au démarrage a échoué : ${cause.message}\n`,
    )
  })

  return {
    server,
    root,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      media: await readManifest(root),
      documents: await readDocuments(root),
    }),
    publisher,
    leads: {
      notify: site.capabilities.notifyLeads,
      to: contactAddress(process.env),
      provider,
      months,
    },
    accessLog: accessLogPath(process.env),
  }
}
