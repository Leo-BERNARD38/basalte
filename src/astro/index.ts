// L’intégration Astro. Elle charge la configuration du site, parcourt les
// blocs du socle puis ceux du dépôt, valide le contenu, et expose le tout au
// rendu par un module virtuel. Le `astro.config.mjs` d’un dépôt client tient
// donc en quatre lignes.
//
// Le même fichier de configuration produit deux choses selon le mode : le site
// public, statique, et le panel, servi par un processus Node. `astro dev` monte
// les deux ; `astro build` ne construit que le site, et `BASALTE_MODE=panel
// astro build` que le panel. Les deux ont des durées de vie opposées — le site
// est reconstruit à chaque mise en ligne, le panel seulement à un déploiement.
//
// Le module `virtual:basalte` est un vrai fichier, écrit dans le dossier de
// génération du projet : la collecte des styles d’Astro parcourt le graphe des
// modules et ne traverse pas un module purement virtuel, dont les composants
// de blocs perdraient leur CSS.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

import type { BlockRegistry } from '../blocks/define.js'
import type { BlockSource } from '../blocks/scan.js'
import type { ChromeContent } from '../chrome/define.js'
import type { Post } from '../journal/define.js'
import { feedPaths } from '../journal/feed.js'
import { notFoundRoute, supportsOf } from '../render/supports.js'
import { CHROME_FILE } from '../content/chrome.js'
import { CONTENT_DIR } from '../content/page.js'
import { errorsOf, readProject, type RenderedPage } from '../content/project.js'
import { renderIssue } from '../content/report.js'
import type { DocumentManifest } from '../media/documents.js'
import type { MediaManifest } from '../media/manifest.js'
import type { BusinessFacts } from '../seo/business.js'
import { ROBOTS_FILE, SITEMAP_FILE } from '../seo/sitemap.js'
import type { Site } from '../site/define.js'
import { CONFIG_FILE } from '../site/load.js'

/** Le dossier des fichiers du panel, distinct de celui du site public. */
export const PANEL_ASSETS = '_panel'

const VIRTUAL = 'virtual:basalte'
const GENERATED = 'basalte.ts'
const MODE = 'BASALTE_MODE'
const PANEL = 'panel'
const PACKAGE = '@leobernard/basalte'
const OTHER_PACKAGES = /node_modules\/(?!@leobernard\/basalte\/)/

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
        command,
        updateConfig,
        injectRoute,
        addMiddleware,
        addWatchFile,
        createCodegenDir,
        logger,
      }) => {
        const root = fileURLToPath(config.root)
        const panel = command === 'dev' || process.env[MODE] === PANEL
        const publicSite = command === 'dev' || !panel

        const {
          site,
          sources,
          chromeSources,
          journalSources,
          registry,
          chrome,
          chromeContent,
          journal,
          posts,
          business,
          pages,
          media,
          documents,
          issues,
        } = await readProject(root)
        const errors = errorsOf(issues)

        for (const issue of issues) {
          if (issue.severity !== 'error') logger.warn(renderIssue(issue))
        }

        // Une erreur de contenu arrête la construction du site public, jamais
        // celle du panel : c’est lui qui sert à la corriger.
        if (errors.length > 0) {
          const report = errors
            .map((issue) => `  - ${renderIssue(issue)}`)
            .join('\n')

          if (publicSite && command === 'build') {
            throw new Error(
              `Le contenu ne passe pas la validation :\n${report}`,
            )
          }

          logger.warn(`Le contenu ne passe pas la validation :\n${report}`)
        }

        const used = new Set(
          pages.flatMap((entry) =>
            entry.page.blocks.map((section) => section.type),
          ),
        )

        const generated = await generate(createCodegenDir(), {
          root,
          site,
          dev: command === 'dev',
          registry,
          chrome,
          chromeContent,
          chromeSources,
          journal,
          journalSources,
          posts,
          business,
          pages,
          media,
          documents,
          sources: panel
            ? sources
            : sources.filter((source) => used.has(source.name)),
        })

        updateConfig({
          vite: {
            plugins: [virtualModule(generated)],
            server: { fs: { allow: [fileURLToPath(own('../../'))] } },
          },
          // Les redirections déclarées deviennent des pages rendues au build,
          // jamais une règle du proxy : le `Caddyfile` n’est pas régénéré, et
          // une redirection ajoutée après coup n’y arriverait jamais (D122).
          redirects: site.redirects,
        })

        if (publicSite) {
          injectRoute({
            pattern: '/[...slug]',
            entrypoint: own('./page.astro'),
            prerender: true,
          })

          for (const [pattern, file] of [
            [`/${SITEMAP_FILE}`, './sitemap.js'],
            [`/${ROBOTS_FILE}`, './robots.js'],
          ] as const) {
            injectRoute({ pattern, entrypoint: own(file), prerender: true })
          }

          // Un flux par langue en ligne, servi par un seul module : les
          // adresses sont statiques, et c’est celle qui est demandée qui dit
          // quelle langue rendre.
          if (site.journal !== undefined) {
            for (const pattern of feedPaths(site.journal, site.languages)) {
              injectRoute({
                pattern,
                entrypoint: own('./feed.js'),
                prerender: true,
              })
            }
          }

          // Une page 404 par support : c’est son adresse qui dit laquelle est
          // laquelle, et le proxy sert celle du support qu’il a servi.
          for (const support of supportsOf(site)) {
            injectRoute({
              pattern: notFoundRoute(support),
              entrypoint: own('./notfound.astro'),
              prerender: true,
            })
          }
        }

        if (panel) {
          await mountPanel(command, updateConfig, injectRoute, addMiddleware)
        }

        // Le banc de blocs n’existe que pendant qu’on développe : il rend des
        // valeurs d’exemple, et aucune version publiée n’a à le porter.
        if (command === 'dev') {
          injectRoute({
            pattern: '/__blocs',
            entrypoint: own('./blocks.astro'),
            prerender: false,
          })
        }

        addWatchFile(path.join(root, CONFIG_FILE))
        addWatchFile(path.join(root, CONTENT_DIR, CHROME_FILE))

        for (const entry of pages) {
          addWatchFile(path.join(root, CONTENT_DIR, `${entry.name}.json`))
        }

        if (site.journal !== undefined) {
          for (const post of posts) {
            addWatchFile(
              path.join(
                root,
                CONTENT_DIR,
                site.journal.base,
                `${post.slug}.json`,
              ),
            )
          }
        }
      },
    },
  }
}

type Setup = Parameters<
  NonNullable<AstroIntegration['hooks']['astro:config:setup']>
>[0]

// React et l’adaptateur Node ne sont chargés qu’en mode panel : la
// construction du site public n’a besoin ni de l’un ni de l’autre.
//
// Le panel arrive compilé, sous `node_modules`, là où Vite n’applique Babel à
// rien par défaut : sans ces deux réglages, le compilateur React ne verrait
// jamais le seul React du projet (D39).
//
// Ses fichiers ne vont pas dans `_astro/`, où le site public range les siens :
// le proxy sert le site depuis le disque et le panel depuis l’application, et
// un dossier commun ferait chercher l’island du panel parmi les fichiers du
// site — une page vide, sans la moindre erreur côté serveur (D85).
async function mountPanel(
  command: Setup['command'],
  updateConfig: Setup['updateConfig'],
  injectRoute: Setup['injectRoute'],
  addMiddleware: Setup['addMiddleware'],
): Promise<void> {
  const { default: react } = await import('@astrojs/react')

  updateConfig({
    build: { assets: PANEL_ASSETS },
    vite: { optimizeDeps: { exclude: [PACKAGE] } },
    integrations: [
      react({
        exclude: [OTHER_PACKAGES],
        babel: { plugins: [['babel-plugin-react-compiler', {}]] },
      }),
    ],
  })

  if (command === 'build') {
    const { default: node } = await import('@astrojs/node')

    const adapter = node({ mode: 'standalone' })

    updateConfig({ output: 'server', adapter, integrations: [adapter] })
  }

  addMiddleware({ entrypoint: own('./middleware.js'), order: 'pre' })

  for (const [pattern, file] of [
    ['/admin', './admin.astro'],
    ['/admin/rescue', './rescue.js'],
    ['/admin/preview/[...slug]', './preview.astro'],
    ['/api/[...route]', './api.js'],
    ['/media/[file]', './media.js'],
    ['/documents/[file]', './documents.js'],
  ] as const) {
    injectRoute({ pattern, entrypoint: own(file), prerender: false })
  }
}

// L’entrée d’une route injectée est passée en URL de fichier : Astro la
// convertit lui-même, là où un chemin Windows serait lu comme un schéma.
function own(relative: string): URL {
  return new URL(relative, import.meta.url)
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
// un système. Les variantes bureau passent par les mêmes imports : c’est ce qui
// leur fait porter leur CSS jusqu’au rendu (D45).
//
// Le registre y est écrit en JSON plutôt que reparcouru à l’exécution : une
// fois le serveur du panel groupé, `import.meta.url` ne désigne plus le dossier
// des blocs, et le scan ne trouverait que ceux du dépôt client.
async function generate(
  directory: URL,
  data: {
    readonly root: string
    readonly site: Site
    readonly dev: boolean
    readonly registry: BlockRegistry
    readonly chrome: BlockRegistry
    readonly chromeContent: ChromeContent
    readonly chromeSources: readonly BlockSource[]
    readonly journal: BlockRegistry
    readonly journalSources: readonly BlockSource[]
    readonly business: BusinessFacts
    readonly pages: readonly RenderedPage[]
    readonly posts: readonly Post[]
    readonly media: MediaManifest
    readonly documents: DocumentManifest
    readonly sources: readonly BlockSource[]
  },
): Promise<string> {
  const file = path.join(fileURLToPath(directory), GENERATED)

  // Les variantes bureau ne sont importées que si le site en sert : sans cette
  // garde, leur CSS entrerait dans le paquet d’un site à un seul rendu, que
  // rien ne le rende ou non — la collecte des styles d’Astro parcourt le graphe
  // des modules, pas les pages.
  const built = supportsOf(data.site).includes('desktop')

  // Les blocs, le chrome et le gabarit du billet suivent exactement le même
  // chemin : imports relatifs pour que leur CSS soit collecté (D45), variantes
  // bureau sous la même garde. Une seule fonction les prépare — trois copies
  // de ces quinze lignes étaient l’endroit où la quatrième aurait divergé.
  const blocks = bundle(file, data.sources, 'Block', built)
  const chrome = bundle(file, data.chromeSources, 'Chrome', built)
  const journal = bundle(file, data.journalSources, 'Journal', built)

  // Les fonctions ne survivent pas au JSON du registre : le module généré
  // importe donc les schémas qui en portent une, comme il importe les
  // composants. C’est ce qui garde une seule source de données structurées pour
  // les deux rendus (D121).
  const carrying = [
    ...data.sources.map((source) => ({
      source,
      definition: data.registry[source.name],
    })),
    ...data.journalSources.map((source) => ({
      source,
      definition: data.journal[source.name],
    })),
  ].filter((entry) => entry.definition?.structured !== undefined)

  const schemaLines = carrying.map(
    ({ source }, index) =>
      `import Schema${index} from ${JSON.stringify(specifier(file, source.schema))}`,
  )

  const builders = carrying.map(
    ({ source }, index) =>
      `${JSON.stringify(source.name)}: Schema${index}.structured`,
  )

  const contents = [
    '// Fichier généré par @leobernard/basalte à chaque démarrage. Ne pas modifier.',
    ...blocks.imports,
    ...chrome.imports,
    ...journal.imports,
    ...schemaLines,
    `export const root = ${JSON.stringify(data.root)}`,
    `export const site = ${JSON.stringify(data.site)}`,
    `export const dev = ${JSON.stringify(data.dev)}`,
    `export const registry = ${JSON.stringify(data.registry)}`,
    `export const pages = ${JSON.stringify(data.pages)}`,
    `export const posts = ${JSON.stringify(data.posts)}`,
    `export const media = ${JSON.stringify(data.media)}`,
    `export const documents = ${JSON.stringify(data.documents)}`,
    `export const chromeRegistry = ${JSON.stringify(data.chrome)}`,
    `export const chromeContent = ${JSON.stringify(data.chromeContent)}`,
    `export const business = ${JSON.stringify(data.business)}`,
    `export const journalRegistry = ${JSON.stringify(data.journal)}`,
    `export const blocks = { ${blocks.entries.join(', ')} }`,
    `export const desktop = { ${blocks.desktops.join(', ')} }`,
    `export const chrome = { ${chrome.entries.join(', ')} }`,
    `export const chromeDesktop = { ${chrome.desktops.join(', ')} }`,
    `export const journalBlocks = { ${journal.entries.join(', ')} }`,
    `export const journalDesktop = { ${journal.desktops.join(', ')} }`,
    `export const structured = { ${builders.join(', ')} }`,
    '',
  ].join('\n')

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, contents, 'utf8')

  return file
}

/**
 * Les imports et les entrées de registre d’un jeu de composants. Le préfixe
 * distingue les identifiants d’un jeu à l’autre dans le même fichier généré.
 */
function bundle(
  file: string,
  sources: readonly BlockSource[],
  prefix: string,
  built: boolean,
): {
  readonly imports: readonly string[]
  readonly entries: readonly string[]
  readonly desktops: readonly string[]
} {
  const imports = sources.map(
    (source, index) =>
      `import ${prefix}${index} from ${JSON.stringify(specifier(file, source.component))}`,
  )

  const entries = sources.map(
    (source, index) => `${JSON.stringify(source.name)}: ${prefix}${index}`,
  )

  const variants = sources.flatMap((source, index) =>
    !built || source.desktop === undefined
      ? []
      : [{ name: source.name, from: source.desktop, index }],
  )

  return {
    imports: [
      ...imports,
      ...variants.map(
        ({ from, index }) =>
          `import ${prefix}Desktop${index} from ${JSON.stringify(specifier(file, from))}`,
      ),
    ],
    entries,
    desktops: variants.map(
      ({ name, index }) => `${JSON.stringify(name)}: ${prefix}Desktop${index}`,
    ),
  }
}

function specifier(from: string, target: string): string {
  const relative = path
    .relative(path.dirname(from), target)
    .split(path.sep)
    .join('/')

  return relative.startsWith('.') ? relative : `./${relative}`
}
