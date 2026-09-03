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

import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

import type { BlockRegistry } from '../blocks/define.js'
import type { BlockSource } from '../blocks/scan.js'
import type { ChromeContent } from '../chrome/define.js'
import type { Post } from '../journal/define.js'
import { feedPaths } from '../journal/feed.js'
import { notFoundRoute, supportsOf } from '../render/supports.js'
import { CONTENT_DIR } from '../content/page.js'
import { errorsOf, readProject, type RenderedPage } from '../content/project.js'
import { renderIssue } from '../content/report.js'
import { writtenByPanel } from '../content/write.js'
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

// Ce que le guetteur demande au serveur de Vite, et rien de plus : ses types ne
// sont pas importés, un dépôt client ne les a pas sous la main.
type DevServer = {
  readonly watcher: {
    add(target: string): unknown
    on(event: string, listener: (file: string) => void): unknown
  }
  readonly moduleGraph: { onFileChange(file: string): void }
  readonly hot: { send(payload: { readonly type: 'full-reload' }): void }
}

type ContentPlugin = {
  readonly name: string
  configureServer(server: DevServer): void
}

export default function basalte(): AstroIntegration {
  return {
    name: '@leobernard/basalte',
    hooks: {
      'astro:config:setup': async (setup) => {
        const hot = await sourceIntegration(setup.command)

        if (hot !== undefined) return hot.hooks['astro:config:setup']?.(setup)

        const {
          config,
          command,
          updateConfig,
          injectRoute,
          addMiddleware,
          addWatchFile,
          createCodegenDir,
          logger,
        } = setup
        const root = fileURLToPath(config.root)
        const panel = command === 'dev' || process.env[MODE] === PANEL
        const publicSite = command === 'dev' || !panel
        const codegen = createCodegenDir()

        // Le projet est lu et le module généré écrit ici, puis à chaque fois
        // que `content/` change sous `astro dev` : c’est ce qui fait qu’un
        // enregistrement du panel ou un JSON retouché à la main se voient
        // sans relancer le serveur.
        const prepare = async (): Promise<{
          readonly site: Site
          readonly generated: string
        }> => {
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

          // Une erreur de contenu arrête la construction du site public,
          // jamais celle du panel : c’est lui qui sert à la corriger.
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

          const generated = await generate(codegen, {
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

          return { site, generated }
        }

        const { site, generated } = await prepare()

        updateConfig({
          vite: {
            plugins: [
              virtualModule(generated),
              ...(command === 'dev'
                ? [
                    contentWatcher({
                      root,
                      generated,
                      regenerate: async () => {
                        await prepare()
                      },
                      warn: (message) => logger.warn(message),
                    }),
                  ]
                : []),
            ],
            resolve: { alias: [...sourceAliases()] },
            server: {
              fs: { allow: [fileURLToPath(own('../../'))] },
              // Le module généré n’est réécrit que par le guetteur, qui sait
              // quand recharger : Vite ne doit pas le voir changer lui-même.
              watch: { ignored: [generated] },
            },
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

        // La configuration du site, elle, redémarre le serveur : elle décide
        // des routes, des langues et des redirections, que seul un nouveau
        // départ peut rejouer.
        addWatchFile(path.join(root, CONFIG_FILE))
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
//
// Chargée depuis `src/` plutôt que depuis `dist/` — c’est ce que fait la
// démonstration, pour que chaque fichier du socle se recharge à chaud —,
// l’intégration désigne ses voisins par le nom du fichier compilé, qui
// n’existe pas encore : c’est alors la source du même nom qui est prise.
function own(relative: string): URL {
  const compiled = new URL(relative, import.meta.url)

  if (!relative.endsWith('.js') || existsSync(compiled)) return compiled

  const source = new URL(relative.replace(/\.js$/, '.ts'), import.meta.url)

  return existsSync(source) ? source : compiled
}

/** Vrai quand l’intégration tourne depuis ses sources, et non compilée. */
function fromSources(): boolean {
  return fileURLToPath(import.meta.url).endsWith('.ts')
}

/**
 * Sous `astro dev`, dans le dépôt du socle lui-même, l’intégration compilée
 * s’efface devant ses sources : c’est la même intégration, chargée depuis
 * `src/`, qui monte le site et le panel. Tout ce qu’elle désigne — blocs,
 * chrome, routes, island — vient alors des sources, et Vite les recharge à
 * chaud sans reconstruire `dist/` ni relancer le serveur.
 *
 * Un dépôt client n’a pas de `src/` à côté de `dist/` — le paquet ne livre
 * que `dist/` et `notes/` — et n’entre jamais ici. La configuration d’Astro
 * ne peut pas importer les sources elle-même : elle est lue par un chargeur
 * que Vite referme avant que les hooks ne s’exécutent.
 */
async function sourceIntegration(
  command: Setup['command'],
): Promise<AstroIntegration | undefined> {
  if (command !== 'dev' || fromSources()) return undefined

  const sources = new URL('../../src/', import.meta.url)
  const entry = new URL('astro/index.ts', sources)

  if (!existsSync(entry)) return undefined

  resolveSources(sources)

  const loaded = (await import(/* @vite-ignore */ entry.href)) as {
    readonly default: () => AstroIntegration
  }

  return loaded.default()
}

const RELATIVE = /^\.\.?\//

let sourcesResolved = false

// Node efface les types d’un `.ts` à la volée, mais ne réécrit pas les
// spécificateurs : un `./x.js` importé depuis `src/` désigne un fichier que
// seule la compilation produit. Tant que le fichier compilé manque, c’est la
// source du même nom qui est chargée — et elle seule, jamais `node_modules`.
function resolveSources(sources: URL): void {
  if (sourcesResolved) return

  sourcesResolved = true

  registerHooks({
    resolve(specifier, context, next) {
      const parent = context.parentURL

      if (
        parent !== undefined &&
        parent.startsWith(sources.href) &&
        RELATIVE.test(specifier) &&
        specifier.endsWith('.js')
      ) {
        const compiled = new URL(specifier, parent)

        if (!existsSync(compiled)) {
          return {
            url: compiled.href.replace(/\.js$/, '.ts'),
            shortCircuit: true,
          }
        }
      }

      return next(specifier, context)
    },
  })
}

// Depuis les sources, le nom du paquet doit lui aussi mener aux sources :
// sans quoi l’island du panel et les blocs du site viendraient de `dist/`,
// et le serveur du panel existerait deux fois — une par copie des modules.
function sourceAliases(): readonly { find: RegExp; replacement: string }[] {
  if (!fromSources()) return []

  return [
    {
      find: /^@leobernard\/basalte\/admin$/,
      replacement: fileURLToPath(own('../admin/Panel.tsx')),
    },
    {
      find: /^@leobernard\/basalte\/astro$/,
      replacement: fileURLToPath(own('./index.ts')),
    },
    {
      find: /^@leobernard\/basalte$/,
      replacement: fileURLToPath(own('../index.ts')),
    },
  ]
}

// Le contenu change sans relancer : chaque fichier de `content/` qui bouge
// fait réécrire le module généré, puis l’invalide dans le graphe de Vite. La
// page se recharge quand le changement vient d’ailleurs que du panel — un JSON
// retouché à la main, un `git pull` — et pas quand c’est lui qui enregistre.
// Les changements d’un même instant sont regroupés : une sauvegarde en écrit
// plusieurs, dont un manifeste.
export function contentWatcher(input: {
  readonly root: string
  readonly generated: string
  readonly regenerate: () => Promise<void>
  readonly warn: (message: string) => void
}): ContentPlugin {
  const directory = path.join(input.root, CONTENT_DIR) + path.sep

  return {
    name: 'basalte:content',

    configureServer(server) {
      let pending: ReturnType<typeof setTimeout> | undefined
      let reload = false

      const refresh = async (): Promise<void> => {
        const shouldReload = reload

        reload = false

        try {
          await input.regenerate()
        } catch (cause) {
          input.warn(
            `Le contenu n’a pas pu être relu : ${(cause as Error).message}`,
          )

          return
        }

        server.moduleGraph.onFileChange(input.generated)

        if (shouldReload) server.hot.send({ type: 'full-reload' })
      }

      const changed = (file: string): void => {
        if (!file.startsWith(directory) || !file.endsWith('.json')) return

        reload ||= !writtenByPanel(file)

        clearTimeout(pending)
        pending = setTimeout(() => void refresh(), 150)
      }

      server.watcher.add(directory)
      server.watcher.on('add', changed)
      server.watcher.on('change', changed)
      server.watcher.on('unlink', changed)
    },
  }
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
