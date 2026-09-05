// Un chemin de documentation cité dans le dépôt doit exister. C’est la règle
// qui manquait le jour où le suivi a quitté les fichiers Markdown : supprimer
// un document laisse derrière lui des renvois que rien ne signale — ni le
// typecheck, ni les tests, ni le build. Ils se découvrent en cliquant.
//
// La relecture à la main ne suffit pas, et ce n’est pas une question de soin :
// les renvois se cachent dans des extensions qu’on ne pense pas à ouvrir. Le
// message d’une commande en porte un (`src/cli/run.ts`), un commentaire de
// module aussi.
//
// Ce qui est lu, et pourquoi cette ligne-là :
//
//   - dans un `.md`, tout est de la prose : chaque mention est un renvoi ;
//   - ailleurs, un **chemin barré** en est un partout — un libellé de commande
//     en porte —, tandis qu’un **nom seul** n’en est un que dans un
//     commentaire. Un `path.posix.join` qui assemble le nom d’un fichier de
//     skill construit un chemin, il n’en cite aucun.
//
// Une mention sans barre se cherche dans `docs/`, parce que c’est ainsi qu’on
// écrit un renvoi ici : « voir `panel.md` », jamais « voir `docs/panel.md` ».
//
// Deux familles résolvent sans exister dans ce dépôt, et les confondre avec des
// renvois morts rendrait la règle rouge dès son premier lancement :
//
//   - les chemins d’un **dépôt client**, que `basalte init` écrit. Le socle les
//     cite pour les décrire. La liste n’est pas recopiée : elle vient de
//     `siteFiles`, donc elle suit ce que la génération produit vraiment ;
//   - une **note de version**, qui n’existe qu’après la publication qui la
//     crée. `notes/vX.Y.Z.md` est un gabarit, pas un fichier.
//
// Les tests et les bancs d’essai sont hors du contrôle : ils citent des noms
// inventés exprès.

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { AGENT_DOC } from '../client/agent.js'
import { siteFiles } from '../client/create.js'
import { DEFAULT_PROFILE } from '../client/files.js'
import { finding, relative, type Finding } from './finding.js'
import { isComment } from './source.js'

const SKIPPED = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  'coverage',
  '.tmp',
])

const READ = /\.(md|ts|tsx|astro|css|mjs|yml|yaml)$/
const INVENTED = /\.(test|fixture)\.[cm]?[jt]sx?$/
const PROSE = /\.md$/

/** Un chemin de document tel qu’on l’écrit dans de la prose ou un commentaire. */
const MENTION = /\.?[A-Za-z0-9_][A-Za-z0-9_./-]*\.md/g

/** Une note de version n’existe qu’après la publication qui l’écrit. */
const RELEASE_NOTE = /^notes\/v[0-9X][0-9A-Za-z.-]*\.md$/

const DOCS = 'docs'

export async function deadReferences(
  root: string,
): Promise<readonly Finding[]> {
  const files = await walk(root)
  const present = new Set(files.map((file) => relative(root, file)))
  const generated = generatedPaths()

  const findings: Finding[] = []

  for (const file of files) {
    if (!READ.test(file) || INVENTED.test(file)) continue

    const named = relative(root, file)
    const prose = PROSE.test(named)
    const directory = path.posix.dirname(named)
    const lines = (await readFile(file, 'utf8')).split('\n')

    lines.forEach((text, index) => {
      const commented = prose || isComment(text)

      for (const mention of text.match(MENTION) ?? []) {
        if (!commented && !mention.includes('/')) continue
        if (resolves(mention, directory, present, generated)) continue

        findings.push(
          finding({
            file: named,
            line: index + 1,
            rule: 'docs/reference',
            message: `« ${mention} » n’existe pas — corrige le renvoi, ou retire la phrase qui le porte.`,
            severity: 'error',
          }),
        )
      }
    })
  }

  return findings
}

function resolves(
  mention: string,
  directory: string,
  present: ReadonlySet<string>,
  generated: ReadonlySet<string>,
): boolean {
  const beside = directory === '.' ? mention : `${directory}/${mention}`

  return (
    present.has(mention) ||
    present.has(beside) ||
    present.has(`${DOCS}/${mention}`) ||
    generated.has(mention) ||
    generatedByName(generated, mention) ||
    RELEASE_NOTE.test(mention)
  )
}

/**
 * Un fichier d’un dépôt client cité par son seul nom. L’arborescence de
 * `depot-client.md` les écrit ainsi, et la dessiner en chemins complets la
 * rendrait illisible.
 */
function generatedByName(
  generated: ReadonlySet<string>,
  mention: string,
): boolean {
  if (mention.includes('/')) return false

  for (const file of generated) {
    if (file.endsWith(`/${mention}`)) return true
  }

  return false
}

/**
 * Ce qu’un dépôt client contient, demandé à la génération elle-même. Les
 * réponses ne servent qu’à la produire : aucun chemin n’en dépend.
 */
function generatedPaths(): ReadonlySet<string> {
  const files = siteFiles(
    {
      slug: 'site',
      name: 'Site',
      domain: 'exemple.fr',
      languages: ['fr'],
      profile: DEFAULT_PROFILE,
    },
    {
      name: '@socle/socle',
      version: '0.0.0',
      astro: '0.0.0',
      repository: 'owner/socle',
    },
  )

  // Le document d’inventaire n’est pas écrit par `init` mais par le
  // `postinstall` qui suit (D27, D89) : la génération ne le porte donc pas.
  return new Set([...files.map((file) => file.path), AGENT_DOC])
}

async function walk(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    if (SKIPPED.has(entry.name)) continue

    const full = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      found.push(...(await walk(full)))
    } else if (entry.isFile()) {
      found.push(full)
    }
  }

  return found
}
