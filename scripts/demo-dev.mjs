// Le panel, en développement, sur le site de démonstration.
//
// Trois choses que `astro dev` seul ne fait pas : construire `dist/` (le site
// de démonstration importe le socle par son paquet), créer le compte éditeur
// s’il n’existe pas — sans compte, `/admin` ne mène qu’à un écran de connexion
// infranchissable — et dire où aller.
//
// Aucune clé d’email n’étant configurée, le canal retombe sur le fournisseur
// « console » : le code à six chiffres s’affiche dans ce terminal, et rien ne
// part sur le réseau.

import { execFileSync, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demo = path.join(root, 'examples', 'demo')

const EMAIL = 'demo@basalte.test'
const PASSWORD = 'basalte-demo-2026'

execFileSync(process.execPath, [path.join(root, 'scripts', 'build.mjs')], {
  cwd: root,
  stdio: 'inherit',
})

const { loadSite } = await import(pathToUrl('dist/site/load.js'))
const { databasePath, openDatabase } = await import(
  pathToUrl('dist/server/database.js')
)
const { createAccount, findAccount } = await import(
  pathToUrl('dist/server/account.js')
)

const site = await loadSite(demo)
const database = openDatabase(databasePath(demo))
let created = false

try {
  if (findAccount(database, EMAIL) === undefined) {
    await createAccount(database, EMAIL, Date.now(), PASSWORD)
    created = true
  }
} finally {
  database.close()
}

const lines = [
  '',
  `  ${site.name} — panel de développement`,
  '',
  '  Site       http://localhost:4321/',
  '  Panel      http://localhost:4321/admin',
  '',
  `  Compte     ${EMAIL}`,
  `  Mot de passe ${PASSWORD}`,
  '',
  created
    ? '  Compte créé. Le code à six chiffres s’affichera ici, sous la connexion.'
    : '  Compte déjà présent. Le code à six chiffres s’affichera ici, sous la connexion.',
  '',
]

process.stdout.write(lines.join('\n'))

const require = createRequire(path.join(root, 'package.json'))
const astro = path.join(
  path.dirname(require.resolve('astro/package.json')),
  'bin',
  'astro.mjs',
)

const server = spawn(process.execPath, [astro, 'dev', '--root', demo], {
  cwd: root,
  stdio: 'inherit',
})

server.on('exit', (code) => process.exit(code ?? 0))

function pathToUrl(relative) {
  return new URL(`../${relative}`, import.meta.url).href
}
