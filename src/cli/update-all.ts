// `basalte update-all` : la même montée de version sur plusieurs sites, pour un
// correctif de sécurité qui doit atteindre tous les VPS rapidement.
//
// Chaque site est monté par son propre `basalte update`, celui de la version
// qu’il a installée : c’est elle qui sait d’où il part, quelles notes lire, et
// quelles migrations lui manquent. Le socle qui lance la commande n’en sait
// rien — il peut être plus récent, ou plus ancien, que chacun d’eux.
//
// Elle s’arrête au premier site en échec. Continuer laisserait un parc dont on
// ne saurait plus lequel est monté et lequel ne l’est pas — et le site en échec
// est justement celui qui demande de l’attention.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { runNpm, type Npm } from '../client/npm.js'
import { lines as split } from '../client/socle.js'
import { fails, heading, line, positionals, succeeds } from './args.js'
import type { Result } from './run.js'

export async function updateAll(
  argv: readonly string[],
  cwd: string,
  npm: Npm = runNpm,
): Promise<Result> {
  const file = positionals(argv)[0]

  if (file === undefined) {
    return fails([
      'Il manque la liste des sites : basalte update-all <liste>',
      'Un chemin de dépôt par ligne ; « # » ouvre un commentaire.',
    ])
  }

  const sites = await read(path.resolve(cwd, file))

  if (sites.length === 0) {
    return fails([`« ${file} » ne nomme aucun site.`])
  }

  const lines = [...heading('update-all')]

  for (const site of sites) {
    const root = path.resolve(cwd, site)

    process.stdout.write(`\n── ${site} ──\n\n`)

    const result = await npm(root, ['exec', '--', 'basalte', 'update'])

    if (!result.ok) {
      lines.push(
        line('error', `${site} — arrêt ici, les suivants sont intacts`),
      )

      return fails(lines)
    }

    lines.push(line('ok', site))
  }

  return succeeds(lines)
}

async function read(file: string): Promise<readonly string[]> {
  return split(await readFile(file, 'utf8'))
    .map((entry) => entry.split('#')[0]?.trim() ?? '')
    .filter((entry) => entry !== '')
}
