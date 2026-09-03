// Les commandes git du panel. Enregistrer, c’est écrire le fichier puis le
// commiter localement (D17) : instantané, sans réseau, et chaque enregistrement
// devient un point de retour. Le push, lui, appartient à la mise en ligne.
//
// Le commit n’a lieu que si la racine du site est bien la racine d’un dépôt
// git. Un dossier qui n’en est pas un — le site de démonstration, logé dans le
// dépôt du socle — s’enregistre quand même, sans historique : le panel ne
// commite jamais dans un dépôt qui ne lui appartient pas.
//
// L’identité de l’auteur est passée à la commande plutôt que lue dans la
// configuration : la machine du client n’en a aucune, et l’adresse du compte
// qui édite est celle qui doit figurer dans l’historique.
//
// Un git en panne — un verrou, un hook, un chemin disparu — ne fait pas échouer
// ce qui est déjà écrit sur le disque. L’échec est rendu comme une valeur et
// part sur la sortie d’erreur ; l’enregistrement reste acquis : le client a
// sauvé son texte, il perd son point de retour, pas son travail (D66).

import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const AUTHOR = 'Panel basalte'

export type GitRun =
  | { readonly kind: 'done'; readonly stdout: string }
  | { readonly kind: 'failed'; readonly detail: string }

/**
 * Lance git dans le dépôt donné. C’est le seul endroit du socle qui appelle la
 * commande, et il rend l’échec au lieu de le lever.
 */
export async function tryGit(
  root: string,
  args: readonly string[],
): Promise<GitRun> {
  try {
    const { stdout } = await run('git', ['-C', root, ...args])

    return { kind: 'done', stdout }
  } catch (cause) {
    return { kind: 'failed', detail: detailOf(cause) }
  }
}

export async function isRepositoryRoot(root: string): Promise<boolean> {
  const result = await tryGit(root, ['rev-parse', '--show-toplevel'])

  return (
    result.kind === 'done' &&
    path.resolve(result.stdout.trim()) === path.resolve(root)
  )
}

/**
 * Commite les chemins donnés, relatifs à la racine. Rend `false` si le dossier
 * n’est pas un dépôt, si rien n’a changé, ou si git a échoué.
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
  const added = await tryGit(root, ['add', '--', ...paths])

  if (added.kind === 'failed') return abandon(added.detail)

  if (await indexClean(root)) return false

  const committed = await tryGit(root, [
    ...identityOf(email),
    'commit',
    '--no-verify',
    '--message',
    message,
    '--',
    ...paths,
  ])

  return committed.kind === 'failed' ? abandon(committed.detail) : true
}

/**
 * L’identité sous laquelle git écrit, passée à chaque commande qui crée un
 * commit : la machine du client n’en configure aucune, et un rebasage en
 * recrée autant qu’il en rejoue.
 */
export function identityOf(email: string): readonly string[] {
  return ['-c', `user.name=${AUTHOR}`, '-c', `user.email=${email}`]
}

/** Vrai quand l’index ne porte aucune modification. */
async function indexClean(root: string): Promise<boolean> {
  return (await tryGit(root, ['diff', '--cached', '--quiet'])).kind === 'done'
}

function abandon(detail: string): false {
  process.stderr.write(`Le commit n’a pas eu lieu : ${detail}\n`)

  return false
}

function detailOf(cause: unknown): string {
  const error = cause as {
    readonly stdout?: string
    readonly stderr?: string
    readonly message?: string
  }

  return [error.stderr, error.stdout, error.message]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join('\n')
}

/**
 * Ce qui manque à git pour savoir qui commite, ou rien. Une machine neuve — un
 * conteneur, un runner — n’a aucune identité configurée, et un commit est
 * toujours la dernière étape d’un geste : sans cette garde, tout ce qui précède
 * serait annulé pour une ligne de configuration, sur un message de git qui ne
 * dit rien du projet.
 */
export async function missingIdentity(
  root: string,
): Promise<string | undefined> {
  for (const setting of ['user.name', 'user.email']) {
    const read = await tryGit(root, ['config', '--get', setting])

    if (read.kind === 'failed' || read.stdout.trim() === '') {
      return `git ne sait pas qui commite : renseigne « git config --global ${setting} … », puis relance.`
    }
  }

  return undefined
}
