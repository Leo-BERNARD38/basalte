import { describe, expect, it } from 'vitest'

import { findBlocks, loadRegistry, socleBlocks } from '../blocks/scan.js'
import { socleChrome } from '../chrome/scan.js'
import { validateBusiness } from '../content/business.js'
import { validateChrome } from '../content/chrome.js'
import { unknownLinks } from '../content/links.js'
import { routeOf, THANKS_PAGE } from '../content/naming.js'
import { CONTENT_FORMAT } from '../content/page.js'
import { errorsOf } from '../content/project.js'
import { validatePage } from '../content/validate.js'
import { VARIABLES } from '../server/email/provider.js'
import { WEBHOOK_VARIABLE } from '../server/webhook.js'
import { resolveLanguages } from '../site/languages.js'
import { basalteDoc } from './agent.js'
import { executables, siteFiles } from './create.js'
import type { GeneratedFile, SiteAnswers } from './files.js'
import type { Socle } from './socle.js'

// Les fichiers de `content/` qui portent du contenu sans être des pages : ils
// se valident chacun avec sa propre fonction, et ne font aucune route.
const MANIFESTS = /(media|documents|chrome|business)\.json$/

const SOCLE: Socle = {
  name: '@leobernard/basalte',
  version: '1.4.0',
  astro: '7.2.9',
  repository: 'Leo-BERNARD38/basalte',
}

const ANSWERS: SiteAnswers = {
  slug: 'atelier-duvallon',
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: ['fr', 'en'],
  profile: 'vitrine',
}

function generated(answers: SiteAnswers = ANSWERS): Map<string, string> {
  return new Map(
    siteFiles(answers, SOCLE).map((file: GeneratedFile) => [
      file.path,
      file.contents,
    ]),
  )
}

function read(path: string, answers: SiteAnswers = ANSWERS): string {
  const contents = generated(answers).get(path)

  if (contents === undefined) throw new Error(`« ${path} » n’est pas généré.`)

  return contents
}

describe('le dépôt généré', () => {
  it('porte tout ce que docs/depot-client.md décrit', () => {
    const paths = [...generated().keys()]

    for (const expected of [
      'package.json',
      'astro.config.mjs',
      'site.config.ts',
      '.env',
      '.env.example',
      '.gitignore',
      'content/index.json',
      'content/contact.json',
      'content/mentions-legales.json',
      'content/confidentialite.json',
      'content/media.json',
      'compose.yml',
      'Caddyfile',
      'Dockerfile',
      'CLAUDE.md',
      '.claude/skills/nouveau-bloc/SKILL.md',
      '.claude/skills/design/SKILL.md',
      '.claude/skills/contenu/SKILL.md',
      '.claude/skills/mettre-a-jour/SKILL.md',
      '.claude/commands/check.md',
      '.claude/commands/deploy.md',
      '.claude/skills/contexte/SKILL.md',
      '.claude/skills/nouvelle-page/SKILL.md',
      'docs/CONTEXT.md',
      'docs/DESIGN.md',
    ]) {
      expect(paths).toContain(expected)
    }
  })

  it('épingle le socle à la version qui le génère, et Astro à l’exacte', () => {
    const manifest = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>
      scripts: Record<string, string>
    }

    expect(manifest.dependencies['@leobernard/basalte']).toBe(
      'github:Leo-BERNARD38/basalte#v1.4.0',
    )
    expect(manifest.dependencies['astro']).toBe('7.2.9')
    expect(JSON.stringify(manifest.dependencies)).not.toContain('^')
  })

  it('branche la régénération de la doc agent sur l’installation', () => {
    const manifest = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>
    }

    expect(manifest.scripts['postinstall']).toBe('basalte inventory --agent')
    expect(Object.keys(manifest.scripts)).toEqual([
      'dev',
      'check',
      'deploy',
      'doctor',
      'update',
      'postinstall',
    ])
  })

  it('nomme les variables du socle sans en recopier la liste', () => {
    const environment = read('.env')

    for (const name of [...Object.values(VARIABLES), WEBHOOK_VARIABLE]) {
      expect(environment).toContain(`${name}=`)
    }
  })

  // Sa présence dans `content/` est ce qui décide : la supprimer ramène la
  // réponse d’avant, sans qu’un réglage ait à être défait.
  it('pose la page de remerciement, hors du menu', () => {
    expect(read(`content/${THANKS_PAGE}.json`)).toContain('Merci')

    const menu = JSON.parse(read('content/chrome.json')) as {
      header: { links: readonly { href: string }[] }
    }

    expect(menu.header.links.map((entry) => entry.href)).not.toContain(
      routeOf(THANKS_PAGE),
    )
  })

  it('ne versionne ni les secrets ni la base', () => {
    const ignored = read('.gitignore')

    expect(ignored).toContain('.env')
    expect(ignored).toContain('data/')
    expect(ignored).toContain('node_modules/')
  })

  it('déclare la première langue par défaut et les autres en préparation', () => {
    const config = read('site.config.ts')

    expect(config).toContain('fr: { default: true }')
    expect(config).toContain('en: { draft: true }')
    expect(config).toContain("domain: 'atelier-duvallon.fr'")
  })

  it('écrit un contenu au format courant, traduit dans la langue par défaut', () => {
    const page = JSON.parse(read('content/index.json')) as {
      $format: number
      meta: { title: Record<string, string> }
      blocks: readonly { id: string; type: string }[]
    }

    expect(page.$format).toBe(CONTENT_FORMAT)
    expect(page.meta.title['fr']).toBe('Atelier Duvallon')
    expect(page.meta.title['en']).toBe('')
    expect(page.blocks.map((block) => block.type)).toEqual(['hero', 'richtext'])
  })

  it('écrit des documents légaux structurés en titres et en listes', () => {
    for (const path of [
      'content/mentions-legales.json',
      'content/confidentialite.json',
    ]) {
      const page = JSON.parse(read(path)) as {
        $format: number
        blocks: readonly {
          type: string
          props: { body: Record<string, string> }
        }[]
      }
      const body = page.blocks[0]?.props.body['fr'] ?? ''

      expect(page.$format).toBe(CONTENT_FORMAT)
      expect(page.blocks[0]?.type).toBe('richtext')
      expect(body).toContain('## ')
      expect(body).toContain('canevas')
    }

    expect(read('content/confidentialite.json')).toContain('- [')
  })

  it('mène du formulaire à la politique de confidentialité', () => {
    expect(read('content/contact.json')).toContain(
      '[politique de confidentialité](/confidentialite)',
    )
  })

  it.each(['vitrine', 'artisan'] as const)(
    'produit avec le profil %s un contenu que les schémas du socle acceptent',
    async (profile) => {
      const registry = await loadRegistry(
        await findBlocks([{ dir: socleBlocks(), origin: 'socle' }]),
      )
      const languages = resolveLanguages({
        fr: { default: true },
        en: { draft: true },
      })

      const chrome = await loadRegistry(
        await findBlocks([{ dir: socleChrome(), origin: 'socle' }]),
      )
      const files = generated({ ...ANSWERS, profile })

      for (const [path, contents] of files) {
        if (!path.startsWith('content/') || MANIFESTS.test(path)) continue

        const { issues } = validatePage({
          name: path,
          source: JSON.parse(contents),
          registry,
          languages,
          media: {},
          documents: {},
        })

        expect(errorsOf(issues).map((issue) => issue.message)).toEqual([])
      }

      const { issues } = validateChrome({
        source: JSON.parse(files.get('content/chrome.json') ?? '{}'),
        registry: chrome,
        languages,
        media: {},
        documents: {},
      })

      expect(errorsOf(issues).map((issue) => issue.message)).toEqual([])

      const business = validateBusiness({
        source: JSON.parse(files.get('content/business.json') ?? '{}'),
        languages,
        media: {},
        documents: {},
      })

      expect(errorsOf(business.issues).map((issue) => issue.message)).toEqual(
        [],
      )
    },
  )

  it.each(['vitrine', 'artisan'] as const)(
    'ne met au menu du profil %s que des pages qu’il génère',
    async (profile) => {
      const chrome = await loadRegistry(
        await findBlocks([{ dir: socleChrome(), origin: 'socle' }]),
      )
      const files = generated({ ...ANSWERS, profile })
      const languages = resolveLanguages({ fr: { default: true } })

      const routes = [...files.keys()]
        .filter((path) => path.startsWith('content/') && !MANIFESTS.test(path))
        .map((path) => routeOf(path.slice('content/'.length, -'.json'.length)))

      const source = JSON.parse(
        files.get('content/chrome.json') ?? '{}',
      ) as Record<string, unknown>

      const orphans = Object.entries(chrome).flatMap(([slot, definition]) =>
        unknownLinks({
          name: 'chrome',
          fields: definition.fields,
          values: source[slot],
          routes,
          languages,
        }),
      )

      expect(orphans.map((issue) => issue.message)).toEqual([])
      expect(routes).toContain(profile === 'artisan' ? '/services' : '/contact')
    },
  )

  it('déclare les capacités du profil, et rien de plus', () => {
    expect(read('site.config.ts')).toContain('capabilities: {}')
    expect(read('site.config.ts')).toContain('notifyLeads')

    const artisan = read('site.config.ts', {
      ...ANSWERS,
      profile: 'artisan',
    })

    expect(artisan).toContain('documents: true')
  })

  it('donne à l’artisan une page de plus, sans dupliquer une ligne du socle', () => {
    const vitrine = [...generated().keys()]
    const artisan = [...generated({ ...ANSWERS, profile: 'artisan' }).keys()]

    expect(vitrine).not.toContain('content/services.json')
    expect(artisan).toContain('content/services.json')
    expect(artisan.length).toBe(vitrine.length + 1)
  })

  it('pose le hook de pré-commit en exécutable', () => {
    expect(executables(siteFiles(ANSWERS, SOCLE))).toContain(
      '.githooks/pre-commit',
    )
  })

  it('sert le panel et le site depuis deux dossiers distincts', () => {
    const caddy = read('Caddyfile')

    expect(caddy).toContain('/_panel/*')
    expect(caddy).toContain('atelier-duvallon.fr {')
    expect(caddy).toContain('delete token')
    expect(caddy).toContain('Content-Security-Policy')
  })

  it('achemine « /admin » lui-même, pas seulement ce qui le suit', () => {
    expect(read('Caddyfile')).toContain('@panel path /admin /admin/*')
  })

  // Caddy refuse d’adapter le fichier entier plutôt que la seule ligne fautive,
  // et n’en sert alors aucune requête : la forme se vérifie ici, faute de
  // pouvoir lancer Caddy dans une suite de tests.
  it('n’ouvre jamais un bloc en fin de ligne, et ne donne qu’un motif à handle', () => {
    for (const raw of read('Caddyfile').split('\n')) {
      const written = raw.trim()

      if (written.endsWith('{')) {
        expect(written.split('{')).toHaveLength(2)
      }

      if (written.startsWith('handle')) {
        const given = written
          .replace(/\s*\{$/, '')
          .split(/\s+/)
          .slice(1)

        expect(given.length).toBeLessThan(2)
      }
    }
  })

  it('aiguille vers le rendu bureau sur l’indication client, puis le User-Agent', () => {
    const caddy = read('Caddyfile')
    const hinted = caddy.indexOf('header Sec-CH-UA-Mobile ?0')
    const guessed = caddy.indexOf('header !Sec-CH-UA-Mobile')

    expect(hinted).toBeGreaterThan(-1)
    expect(hinted).toBeLessThan(guessed)
    expect(caddy).toContain('not header_regexp User-Agent (Mobi|Android)')
    expect(caddy).toContain('rewrite @hinted {file_match.relative}')
    expect(caddy).toContain('rewrite @guessed {file_match.relative}')
  })

  it('sert la page 404 du site, avec son statut, dans les deux rendus', () => {
    const caddy = read('Caddyfile')

    expect(caddy).toContain('handle_errors {')
    expect(caddy).toContain('@notfound expression {err.status_code} == 404')
    expect(caddy).toContain('rewrite @desktop /_desktop/404/index.html')
    expect(caddy).toContain('rewrite @mobile /404.html')
    expect(caddy).toContain('status 404')
  })

  it('écrit un favicon que le dépôt porte, là où le téléversement le refuse', () => {
    expect(read('public/favicon.svg')).toContain('<svg')
  })

  it('ne réécrit que si la page bureau existe, quelle que soit la capacité', () => {
    const caddy = read('Caddyfile')

    expect(
      caddy.match(
        /try_files \/_desktop\{path} \/_desktop\{path}\/index\.html/g,
      ),
    ).toHaveLength(2)
    expect(caddy).not.toContain('desktopRender')
  })

  it('fait varier les pages sur les deux signaux, et jamais les fichiers du site', () => {
    const caddy = read('Caddyfile')

    expect(caddy).toContain('@page not path /_astro/*')
    expect(caddy).toContain('header @page Vary "User-Agent, Sec-CH-UA-Mobile"')
  })

  it('refuse le préfixe du rendu bureau en direct, pour ne pas dupliquer une page', () => {
    const caddy = read('Caddyfile')

    expect(caddy).toContain('@exposed path /_desktop /_desktop/*')
    expect(caddy).toContain('respond @exposed 404')
  })

  it('sert les images depuis le disque, et l’application en dernier recours', () => {
    const media = read('Caddyfile').split('handle /media/*')[1] ?? ''

    expect(media).toContain('pass_thru')
    expect(media.indexOf('file_server')).toBeLessThan(
      media.indexOf('reverse_proxy'),
    )
    expect(media).toContain('immutable')
  })

  it('construit sur une base glibc, et jamais avec npm install', () => {
    expect(read('Dockerfile')).toContain('node:24-bookworm-slim')
    expect(read('docker-entrypoint.sh')).toContain('npm ci')
    expect(read('docker-entrypoint.sh')).not.toContain('--ignore-scripts')
  })

  it('importe la doc générée depuis le CLAUDE.md écrit une fois', () => {
    expect(read('CLAUDE.md')).toContain('@.claude/basalte.md')
  })

  it('charge le contexte du site à chaque session', () => {
    const claude = read('CLAUDE.md')

    expect(claude).toContain('@docs/CONTEXT.md')
    expect(claude).toContain('@docs/DESIGN.md')
  })

  it('ouvre le contexte sur des questions, jamais sur une page blanche', () => {
    const context = read('docs/CONTEXT.md')

    expect(context).toContain('Atelier Duvallon')
    expect(context).toContain('à compléter')
    expect(read('docs/DESIGN.md')).toContain('à compléter')
    expect(read('.claude/skills/contexte/SKILL.md')).toContain(
      'docs/CONTEXT.md',
    )
  })
})

describe('la doc agent', () => {
  it('porte l’avertissement de fichier généré et l’inventaire', () => {
    const doc = basalteDoc(['  hero — Bandeau principal'], '1.4.0')

    expect(doc).toContain('Ne pas modifier')
    expect(doc).toContain('hero — Bandeau principal')
    expect(doc).toContain('version 1.4.0')
    expect(doc).toContain('Aucun code du socle copié ici')
  })
})
