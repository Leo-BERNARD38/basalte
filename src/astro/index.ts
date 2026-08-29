// L’intégration Astro. Elle charge la configuration du site, parcourt les
// blocs du socle puis ceux du dépôt, valide le contenu, et expose le tout au
// rendu par un module virtuel. Le `astro.config.mjs` d’un dépôt client tient
// donc en quatre lignes.
//
// Le module `virtual:basalte` est un vrai fichier, écrit dans le dossier de
// génération du projet : la collecte des styles d’Astro parcourt le graphe des
// modules et ne traverse pas un module purement virtuel, dont les composants
// de blocs perdraient leur CSS.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

import type { BlockSource } from '../blocks/scan.js'
import { CONTENT_DIR } from '../content/page.js'
import { errorsOf, readProject, type RenderedPage } from '../content/project.js'
import { renderIssue } from '../content/report.js'
import type { MediaManifest } from '../media/manifest.js'
import type { Site } from '../site/define.js'
import { CONFIG_FILE } from '../site/load.js'

const VIRTUAL = 'virtual:basalte'
const GENERATED = 'basalte.ts'

type VirtualPlugin = {
  readonly name: string
  resolveId(id: string): string | undefined
}

export default function basalte(): AstroIntegration {
  return {
    name: '@leobernard/basalte',
    hooks: {
      'astro:config:setup': async ({
        config,
        updateConfig,
        injectRoute,
        addWatchFile,
        createCodegenDir,
        logger,
      }) => {
        const root = fileURLToPath(config.root)
        const { site, sources, pages, media, issues } = await readProject(root)
        const errors = errorsOf(issues)

        for (const issue of issues) {
          if (issue.severity !== 'error') logger.warn(renderIssue(issue))
        }

        if (errors.length > 0) {
          throw new Error(
            `Le contenu ne passe pas la validation :\n${errors
              .map((issue) => `  - ${renderIssue(issue)}`)
              .join('\n')}`,
          )
        }

        const used = new Set(
          pages.flatMap((entry) =>
            entry.page.blocks.map((section) => section.type),
          ),
        )

        const generated = await generate(createCodegenDir(), {
          site,
          pages,
          media,
          sources: sources.filter((source) => used.has(source.name)),
        })

        updateConfig({
          vite: {
            plugins: [virtualModule(generated)],
            server: { fs: { allow: [own('../../')] } },
          },
        })

        injectRoute({
          pattern: '/[...slug]',
          entrypoint: own('./page.astro'),
          prerender: true,
        })

        addWatchFile(path.join(root, CONFIG_FILE))

        for (const entry of pages) {
          addWatchFile(path.join(root, CONTENT_DIR, `${entry.name}.json`))
        }
      },
    },
  }
}

function own(relative: string): string {
  return fileURLToPath(new URL(relative, import.meta.url))
}

function virtualModule(generated: string): VirtualPlugin {
  return {
    name: 'basalte:virtual',

    resolveId(id) {
      return id === VIRTUAL ? generated : undefined
    },
  }
}

// Les composants sont importés par un chemin relatif au fichier généré : une
// instruction d’import ne porte donc jamais de séparateur de chemin propre à
// un système.
async function generate(
  directory: URL,
  data: {
    readonly site: Site
    readonly pages: readonly RenderedPage[]
    readonly media: MediaManifest
    readonly sources: readonly BlockSource[]
  },
): Promise<string> {
  const file = path.join(fileURLToPath(directory), GENERATED)

  const lines = data.sources.map(
    (source, index) =>
      `import Block${index} from ${JSON.stringify(specifier(file, source.component))}`,
  )

  const entries = data.sources.map(
    (source, index) => `${JSON.stringify(source.name)}: Block${index}`,
  )

  const contents = [
    '// Fichier généré par @leobernard/basalte à chaque démarrage. Ne pas modifier.',
    ...lines,
    `export const site = ${JSON.stringify(data.site)}`,
    `export const pages = ${JSON.stringify(data.pages)}`,
    `export const media = ${JSON.stringify(data.media)}`,
    `export const blocks = { ${entries.join(', ')} }`,
    '',
  ].join('\n')

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, contents, 'utf8')

  return file
}

function specifier(from: string, target: string): string {
  const relative = path
    .relative(path.dirname(from), target)
    .split(path.sep)
    .join('/')

  return relative.startsWith('.') ? relative : `./${relative}`
}
