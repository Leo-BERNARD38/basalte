// L’assemblage d’un dépôt client : les fichiers du site, ceux de la machine et
// ceux du paquet Claude Code, réunis puis écrits d’un seul coup.
//
// Rien n’est écrit tant que la liste n’est pas complète : une génération qui
// échoue à mi-chemin laisserait un dossier à moitié fait, que la commande ne
// saurait ni reprendre ni défaire.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { claudeDoc, contextDocs } from './agent.js'
import { machineFiles } from './docker.js'
import { clientFiles, type GeneratedFile, type SiteAnswers } from './files.js'
import { agentSkills } from './skills.js'
import type { Socle } from './socle.js'

export function siteFiles(
  answers: SiteAnswers,
  socle: Socle,
): readonly GeneratedFile[] {
  return [
    ...clientFiles(answers, socle),
    ...machineFiles(answers),
    claudeDoc(answers),
    ...contextDocs(answers),
    ...agentSkills(),
  ]
}

export async function writeSite(
  root: string,
  files: readonly GeneratedFile[],
): Promise<void> {
  for (const file of files) {
    const target = path.join(root, ...file.path.split('/'))

    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, file.contents, 'utf8')
  }
}

/** Les fichiers qui n’ont de sens qu’exécutables, pour l’index de git. */
export function executables(
  files: readonly GeneratedFile[],
): readonly string[] {
  return files
    .filter((file) => file.executable === true)
    .map((file) => file.path)
}
