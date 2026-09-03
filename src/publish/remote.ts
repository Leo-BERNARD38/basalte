// Le dépôt distant, aux deux moments d’une mise en ligne.
//
// **Avant de construire**, le panel rebase sur le distant : tu ajoutes un bloc
// sur mesure depuis ta machine pendant que le client édite depuis le panel, et
// le cas est certain, pas hypothétique. Rebaser d’abord fait construire ce qui
// sera poussé, et fait échouer le conflit avant qu’une seule seconde de build
// n’ait été dépensée.
//
// **Après la bascule**, il pousse. Ce qui est sur GitHub correspond alors à ce
// qui est en ligne, et la sauvegarde hors site suit les publications.
//
// Un conflit arrête tout. Le panel ne tente jamais de le résoudre seul : il
// laisse le dépôt propre, dit au client que son site n’a pas changé, et envoie
// l’erreur au mainteneur.

import { identityOf, isRepositoryRoot, tryGit } from '../server/git.js'

export type RemoteResult =
  | { readonly kind: 'done' }
  /** Aucun dépôt distant : la mise en ligne se fait quand même, sans sauvegarde. */
  | { readonly kind: 'absent' }
  | { readonly kind: 'failed'; readonly detail: string }

/**
 * Vrai quand la racine du site est la racine d’un dépôt qui suit une branche
 * distante.
 *
 * La première moitié n’est pas une précaution de style : git répond pour le
 * dépôt le plus proche au-dessus. Sans elle, publier un dossier logé dans un
 * autre dépôt — le site de démonstration, dans celui du socle — rebaserait et
 * pousserait ce dépôt-là (D62).
 */
export async function hasUpstream(root: string): Promise<boolean> {
  if (!(await isRepositoryRoot(root))) return false

  const result = await tryGit(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ])

  return result.kind === 'done' && result.stdout.trim() !== ''
}

export async function rebaseOnRemote(
  root: string,
  email: string,
): Promise<RemoteResult> {
  if (!(await hasUpstream(root))) return { kind: 'absent' }

  const pulled = await tryGit(root, [...identityOf(email), 'pull', '--rebase'])

  if (pulled.kind === 'done') return { kind: 'done' }

  // Le dépôt ne doit pas rester au milieu d’un rebase : le prochain
  // enregistrement du client y échouerait sans qu’il comprenne pourquoi.
  await tryGit(root, ['rebase', '--abort'])

  return { kind: 'failed', detail: pulled.detail }
}

export async function pushToRemote(root: string): Promise<RemoteResult> {
  if (!(await hasUpstream(root))) return { kind: 'absent' }

  const pushed = await tryGit(root, ['push'])

  return pushed.kind === 'done'
    ? { kind: 'done' }
    : { kind: 'failed', detail: pushed.detail }
}
