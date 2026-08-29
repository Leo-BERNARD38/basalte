// Construit le panel du site de démonstration : sortie serveur, adaptateur
// Node, et aucune page publique. C’est l’artefact qu’un déploiement installe,
// à la durée de vie opposée à celle du site — reconstruit à un déploiement,
// pas à chaque mise en ligne.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const astro = path.join(
  path.dirname(require.resolve('astro/package.json')),
  'bin',
  'astro.mjs',
)

execFileSync(
  process.execPath,
  [astro, 'build', '--root', path.join(root, 'examples', 'demo')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, BASALTE_MODE: 'panel' },
  },
)
