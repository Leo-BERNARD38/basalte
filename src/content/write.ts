// L’écriture d’un fichier de `content/`. Elle passe par un fichier voisin puis
// un renommage : sous POSIX le remplacement est atomique, et une coupure au
// milieu d’une écriture laisse le fichier précédent entier plutôt qu’un JSON
// tronqué.
//
// C’est la même prudence que la bascule d’une version du site (`publish/`), et
// elle vaut ici pour la même raison : `content/media.json` porte toute la
// médiathèque, et un fichier de page porte tout le texte que le client vient
// d’écrire.

import { rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PARTIAL = '.partial'

// Sous `astro dev`, le serveur guette `content/` et recharge la page à chaque
// fichier qui change — sauf ceux que le panel vient d’écrire lui-même : lui
// sait déjà ce qu’il a enregistré, et recharger sous ses pieds l’interromprait.
// Le registre vit sur `globalThis` : le panel et le guetteur sont deux
// instances des mêmes modules dans le même processus.
const WRITTEN = Symbol.for('basalte.written')
const RECENT = 3_000

/** Sérialise en JSON indenté et remplace le fichier d’un seul coup. */
export async function writeJsonFile(
  file: string,
  value: unknown,
): Promise<void> {
  const staged = `${file}${PARTIAL}`

  await writeFile(staged, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

  try {
    await rename(staged, file)
    ledger().set(path.resolve(file), Date.now())
  } catch (cause) {
    await rm(staged, { force: true })

    throw new Error(
      `« ${path.basename(file)} » n’a pas pu être remplacé : ${(cause as Error).message}`,
    )
  }
}

/** Vrai si le panel a écrit ce fichier à l’instant — une fois, puis oublié. */
export function writtenByPanel(file: string, now = Date.now()): boolean {
  const at = ledger().get(path.resolve(file))

  if (at === undefined) return false

  ledger().delete(path.resolve(file))

  return now - at < RECENT
}

function ledger(): Map<string, number> {
  const globals = globalThis as { [WRITTEN]?: Map<string, number> }

  return (globals[WRITTEN] ??= new Map())
}
