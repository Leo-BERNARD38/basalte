// Les notes de version du socle. Un fichier par version, `notes/v1.5.0.md`,
// livré dans le paquet et lisible sur le dépôt public sans authentification.
//
// Leur format est figé, et c’est la seule raison pour laquelle il l’est : la
// skill `mettre-a-jour` d’un dépôt client lit la ligne « Action requise » avant
// de décider quoi que ce soit, et une ligne qui change de forme la rendrait
// muette.

import { socleRawUrl, type Socle } from './socle.js'

export const NOTES_DIR = 'notes'

export type Action = 'aucune' | 'automatique' | 'manuelle' | 'inconnue'

export type ReleaseNote = {
  readonly version: string
  readonly action: Action
  readonly body: string
}

const ACTION = /^\*\*Action requise\s*:\*\*\s*(.+)$/m

export function noteFile(version: string): string {
  return `${NOTES_DIR}/v${version}.md`
}

/** La note d’une version, lue sur le dépôt public du socle. */
export async function fetchNote(
  socle: Socle,
  version: string,
): Promise<ReleaseNote> {
  const url = socleRawUrl(socle, `v${version}`, noteFile(version))

  try {
    const response = await fetch(url)

    return response.ok
      ? readNote(version, await response.text())
      : missing(version)
  } catch {
    return missing(version)
  }
}

export function readNote(version: string, markdown: string): ReleaseNote {
  const declared = ACTION.exec(markdown)?.[1]?.trim().toLowerCase()

  return {
    version,
    action: isAction(declared) ? declared : 'inconnue',
    body: markdown.trim(),
  }
}

function isAction(value: string | undefined): value is Action {
  return value === 'aucune' || value === 'automatique' || value === 'manuelle'
}

function missing(version: string): ReleaseNote {
  return {
    version,
    action: 'inconnue',
    body: `## v${version}\n\n**Action requise :** inconnue\n\nAucune note publiée pour cette version.`,
  }
}
