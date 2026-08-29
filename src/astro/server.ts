// Le serveur du panel, ouvert une fois pour le processus. La base SQLite et le
// canal email ne dépendent que du dépôt, qui ne bouge pas : les rouvrir à
// chaque requête ne servirait qu’à multiplier les descripteurs de fichier.
//
// La file de mise en ligne l’est pour la même raison, en plus forte : deux
// files donneraient deux builds simultanés, et la place unique ne vaudrait
// plus rien.
//
// Les schémas, eux, viennent du module généré au démarrage : le panel ne
// reparcourt pas les blocs. Seul le manifeste des médias est relu à chaque
// requête, parce que le panel lui-même l’écrit.

import { registry, root, site } from 'virtual:basalte'

import type { Schemas } from '../content/project.js'
import { readManifest } from '../media/manifest.js'
import { alertMaintainer } from '../publish/alert.js'
import { createPublisher } from '../publish/publish.js'
import type { Panel } from '../server/context.js'
import { adminAddress } from '../server/email/provider.js'
import { openServer, siteProvider } from '../server/open.js'

let opened: Panel | undefined

export function panelContext(): Panel {
  opened ??= open()

  return opened
}

function open(): Panel {
  // `openServer` charge le `.env` du dépôt : rien ne doit lire l’environnement
  // avant lui.
  const server = openServer(root, site)

  return {
    server,
    root,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      media: await readManifest(root),
    }),
    publisher: createPublisher({
      root,
      site: site.name,
      database: server.database,
      now: server.now,
      alert: alertMaintainer({
        to: adminAddress(process.env),
        provider: siteProvider(site, process.env),
      }),
    }),
  }
}
