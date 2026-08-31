// Le parcours du gabarit d’un billet. Un seul emplacement, `post`, et la même
// règle que le chrome : le dossier du dépôt **remplace** celui du socle (D109).
//
// C’est ce qui le tient hors de la bibliothèque du panel. Un bloc ordinaire
// s’ajoute à une page, et le client pourrait alors poser « billet » au milieu
// d’un accueil ; un gabarit ne s’ajoute pas, il habille ce que le formulaire a
// rempli. Un dépôt client redessine ses billets en écrivant
// `src/journal/post/`, sans recopier une ligne du socle (invariant 8).

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findBlocks, type BlockRoot, type BlockSource } from '../blocks/scan.js'
import { POST_SLOT } from './define.js'

export const JOURNAL_DIR = 'journal'

/** L’emplacement du gabarit du socle, résolu depuis ce fichier compilé. */
export function socleJournal(): string {
  return fileURLToPath(new URL('./', import.meta.url))
}

export function journalRoots(root: string): readonly BlockRoot[] {
  return [
    { dir: socleJournal(), origin: 'socle' },
    { dir: path.join(root, 'src', JOURNAL_DIR), origin: 'site' },
  ]
}

export async function findJournal(
  root: string,
): Promise<readonly BlockSource[]> {
  const found = await findBlocks(journalRoots(root), 'replace')

  for (const source of found) {
    if (source.name !== POST_SLOT) {
      throw new Error(
        `« ${source.name} » n’est pas un emplacement du journal — le seul est « ${POST_SLOT} ».`,
      )
    }
  }

  if (!found.some((source) => source.name === POST_SLOT)) {
    throw new Error(`Le journal n’a pas de gabarit « ${POST_SLOT} ».`)
  }

  return found
}
