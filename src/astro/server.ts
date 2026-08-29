// Le serveur du panel, ouvert une fois pour le processus. La base SQLite et le
// canal email ne dépendent que du dépôt, qui ne bouge pas : les rouvrir à
// chaque requête ne servirait qu’à multiplier les descripteurs de fichier.
//
// Les schémas, eux, viennent du module généré au démarrage : le panel ne
// reparcourt pas les blocs. Seul le manifeste des médias est relu à chaque
// requête, parce que le panel lui-même l’écrit.

import { registry, root, site } from 'virtual:basalte'

import type { Schemas } from '../content/project.js'
import { readManifest } from '../media/manifest.js'
import type { Panel } from '../server/context.js'
import { openServer } from '../server/open.js'

let opened: Panel | undefined

export function panelContext(): Panel {
  opened ??= {
    server: openServer(root, site),
    root,
    schemas: async (): Promise<Schemas> => ({
      site,
      registry,
      media: await readManifest(root),
    }),
  }

  return opened
}
