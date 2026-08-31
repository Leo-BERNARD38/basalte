// `basalte lint` : ce que les conventions interdisent, refusé plutôt
// qu’espéré.
//
// Elles étaient jusqu’ici de la prose — un agent les lit, ou ne les lit pas, et
// rien ne le dit avant la relecture. Chacune des règles rassemblées ici garde
// une phrase de `docs/design.md` ou de `docs/conventions.md`, et rend le même
// verdict que cette phrase, à l’endroit fautif.
//
// Le contrôle ne regarde que ce que ce dépôt contient : un bloc installé sous
// `node_modules` vient du socle, il a passé les mêmes règles chez lui, et le
// signaler ici donnerait un rapport que personne ne peut corriger.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { findBlocks, type BlockSource } from '../blocks/scan.js'
import { CHROME_DIR } from '../chrome/define.js'
import { loadSite } from '../site/load.js'
import { contrastFindings } from './contrast.js'
import { ordered, relative, type Finding } from './finding.js'
import { hardcodedStyle } from './style.js'
import { manualValidation } from './validation.js'
import { catchAll, inlineScripts } from './structure.js'

export async function lintProject(root: string): Promise<readonly Finding[]> {
  const sources = [
    ...(await own(root, 'blocks')),
    ...(await own(root, CHROME_DIR)),
  ]

  const findings: Finding[] = [
    ...(await catchAll(root)),
    ...(await tokens(root)),
  ]

  for (const source of sources) {
    for (const file of components(source)) {
      const contents = await readFile(file, 'utf8')
      const named = relative(root, file)

      findings.push(
        ...hardcodedStyle(named, contents),
        ...inlineScripts(named, contents),
      )
    }

    findings.push(
      ...manualValidation(
        relative(root, source.schema),
        await readFile(source.schema, 'utf8'),
      ),
    )
  }

  return ordered(findings)
}

/**
 * Les blocs que ce dépôt porte, par opposition à ceux qu’il installe. La
 * racine du site est la seule parcourue : celle du socle porte les mêmes noms,
 * et dans le dépôt du socle lui-même les deux désignent les mêmes blocs — sous
 * deux formes, la source et le compilé.
 */
async function own(
  root: string,
  directory: string,
): Promise<readonly BlockSource[]> {
  return findBlocks([
    { dir: path.join(root, 'src', directory), origin: 'site' },
  ])
}

function components(source: BlockSource): readonly string[] {
  return source.desktop === undefined
    ? [source.component]
    : [source.component, source.desktop]
}

/**
 * Le contraste, quand ce dépôt est un site. Le socle n’en est pas un : ses
 * tokens par défaut se contrôlent dans leurs propres tests, et ce chemin y
 * rendrait une erreur de configuration absente.
 */
async function tokens(root: string): Promise<readonly Finding[]> {
  try {
    const site = await loadSite(root)

    return contrastFindings('site.config.ts', site.tokens)
  } catch {
    return []
  }
}
