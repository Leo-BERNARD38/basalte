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

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { findBlocks, type BlockSource } from '../blocks/scan.js'
import { CHROME_DIR } from '../chrome/define.js'
import { JOURNAL_DIR } from '../journal/scan.js'
import { loadSite } from '../site/load.js'
import { listBounds } from './bounds.js'
import { contrastFindings } from './contrast.js'
import { ordered, relative, type Finding } from './finding.js'
import { panelContrast, seedContrast } from './panel.js'
import { hardcodedStyle, PANEL, SITE } from './style.js'
import { manualValidation } from './validation.js'
import { catchAll, inlineScripts } from './structure.js'

export async function lintProject(root: string): Promise<readonly Finding[]> {
  const sources = [
    ...(await own(root, 'blocks')),
    ...(await own(root, CHROME_DIR)),
    ...(await own(root, JOURNAL_DIR)),
  ]

  const findings: Finding[] = [
    ...(await catchAll(root)),
    ...(await tokens(root)),
    ...(await base(root)),
    ...(await panel(root)),
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

    const schema = relative(root, source.schema)
    const declared = await readFile(source.schema, 'utf8')

    findings.push(
      ...manualValidation(schema, declared),
      ...listBounds(schema, declared),
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
 * La feuille commune aux pages, quand ce dépôt la porte. Elle définit les
 * primitives que les blocs emploient — le bouton, en premier — et elle porte
 * donc les mêmes valeurs qu’eux : la tenir hors du contrôle ouvrirait la seule
 * porte par laquelle une couleur en dur peut entrer dans une page.
 */
async function base(root: string): Promise<readonly Finding[]> {
  const sheet = path.join(root, 'src', 'astro', 'base.css')

  if (!(await exists(sheet))) return []

  return hardcodedStyle(relative(root, sheet), await readFile(sheet, 'utf8'), {
    ...SITE,
    whole: true,
  })
}

/**
 * La feuille et les tokens du panel, quand ce dépôt les porte (D164). Un dépôt
 * client installe le panel, il ne l’écrit pas : lui signaler une valeur de la
 * feuille du socle lui donnerait un rapport qu’il ne peut pas corriger.
 */
async function panel(root: string): Promise<readonly Finding[]> {
  const sheet = path.join(root, 'src', 'admin', 'panel.css')

  if (!(await exists(sheet))) return []

  const named = relative(root, sheet)

  return [
    ...hardcodedStyle(named, await readFile(sheet, 'utf8'), PANEL),
    ...panelContrast('src/admin/tokens.ts'),
  ]
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file)

    return true
  } catch {
    return false
  }
}

/**
 * Le contraste, quand ce dépôt est un site. Le socle n’en est pas un : ses
 * tokens par défaut se contrôlent dans leurs propres tests, et ce chemin y
 * rendrait une erreur de configuration absente.
 */
async function tokens(root: string): Promise<readonly Finding[]> {
  try {
    const site = await loadSite(root)

    return [
      ...contrastFindings('site.config.ts', site.tokens),
      ...(site.panel === undefined
        ? []
        : seedContrast('site.config.ts', site.panel.seed)),
    ]
  } catch {
    return []
  }
}
