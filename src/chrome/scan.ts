// Le parcours du chrome : celui du socle, puis celui du dépôt client. Le même
// scanner que les blocs, à une règle près — un dossier du site **remplace**
// celui du socle du même nom, là où deux blocs de même nom sont une erreur.
//
// C’est cette inversion qui satisfait l’invariant 8 : un dépôt client redessine
// son en-tête en écrivant `src/chrome/header/`, sans recopier une ligne du
// socle et sans perdre le repli sur ce que le socle porte pour l’autre
// emplacement.
//
// Rien ici ne s’exécute côté panel : une fois son serveur groupé,
// `import.meta.url` ne désigne plus le dossier du paquet (D56). Le registre
// voyage dans le module généré, comme celui des blocs.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findBlocks, type BlockRoot, type BlockSource } from '../blocks/scan.js'
import { CHROME_DIR, isSlot, SLOTS } from './define.js'

/** L’emplacement du chrome du socle, résolu depuis ce fichier compilé. */
export function socleChrome(): string {
  return fileURLToPath(new URL('./', import.meta.url))
}

export function chromeRoots(root: string): readonly BlockRoot[] {
  return [
    { dir: socleChrome(), origin: 'socle' },
    { dir: path.join(root, 'src', CHROME_DIR), origin: 'site' },
  ]
}

export async function findChrome(
  root: string,
): Promise<readonly BlockSource[]> {
  const found = await findBlocks(chromeRoots(root), 'replace')

  for (const source of found) {
    if (!isSlot(source.name)) {
      throw new Error(
        `« ${source.name} » n’est pas un emplacement du chrome — les emplacements sont ${SLOTS.join(' et ')}.`,
      )
    }
  }

  for (const slot of SLOTS) {
    if (!found.some((source) => source.name === slot)) {
      throw new Error(`Le chrome n’a pas d’emplacement « ${slot} ».`)
    }
  }

  return found
}
