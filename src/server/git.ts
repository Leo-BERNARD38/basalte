// Les commits du panel. Enregistrer, c’est écrire le fichier puis le commiter
// localement (D17) : instantané, sans réseau, et chaque enregistrement devient
// un point de retour. Le push, lui, appartient à la mise en ligne.
//
// Le commit n’a lieu que si la racine du site est bien la racine d’un dépôt
// git. Un dossier qui n’en est pas un — le site de démonstration, logé dans le
// dépôt du socle — s’enregistre quand même, sans historique : le panel ne
// commite jamais dans un dépôt qui ne lui appartient pas.
//
// L’identité de l’auteur est passée à la commande plutôt que lue dans la
// configuration : la machine du client n’en a aucune, et l’adresse du compte
// qui édite est celle qui doit figurer dans l’historique.

import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const AUTHOR = 'Panel basalte'

export async function isRepositoryRoot(root: string): Promise<boolean> {
  try {
    const { stdout } = await run('git', [
      '-C',
      root,
      'rev-parse',
      '--show-toplevel',
    ])

    return path.resolve(stdout.trim()) === path.resolve(root)
  } catch {
    return false
  }
}

/**
 * Commite les chemins donnés, relatifs à la racine. Rend `false` si le dossier
 * n’est pas un dépôt ou si rien n’a changé.
 */
export async function commitFiles(
  root: string,
  files: readonly string[],
  message: string,
  email: string,
): Promise<boolean> {
  if (files.length === 0) return false
  if (!(await isRepositoryRoot(root))) return false

  const paths = files.map((file) => file.split(path.sep).join('/'))

  await run('git', ['-C', root, 'add', '--', ...paths])

  if (await indexClean(root)) return false

  await run('git', [
    '-C',
    root,
    '-c',
    `user.name=${AUTHOR}`,
    '-c',
    `user.email=${email}`,
    'commit',
    '--no-verify',
    '--message',
    message,
    '--',
    ...paths,
  ])

  return true
}

/** Vrai quand l’index ne porte aucune modification. */
async function indexClean(root: string): Promise<boolean> {
  try {
    await run('git', ['-C', root, 'diff', '--cached', '--quiet'])

    return true
  } catch {
    return false
  }
}
