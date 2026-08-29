import { describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import { VARIABLES } from '../server/email/provider.js'
import { basalteDoc } from './agent.js'
import { executables, siteFiles } from './create.js'
import type { GeneratedFile, SiteAnswers } from './files.js'
import type { Socle } from './socle.js'

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

  it('nomme les six variables d’email sans en recopier la liste', () => {
    const environment = read('.env')

    for (const name of Object.values(VARIABLES)) {
      expect(environment).toContain(`${name}=`)
    }
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

  it('pose le hook de pré-commit en exécutable', () => {
    expect(executables(siteFiles(ANSWERS, SOCLE))).toContain(
      '.githooks/pre-commit',
    )
  })

  it('sert le panel et le site depuis deux dossiers distincts', () => {
    const caddy = read('Caddyfile')

    expect(caddy).toContain('handle /_panel/*')
    expect(caddy).toContain('atelier-duvallon.fr {')
    expect(caddy).toContain('delete token')
    expect(caddy).toContain('Content-Security-Policy')
  })

  it('achemine « /admin » lui-même, pas seulement ce qui le suit', () => {
    expect(read('Caddyfile')).toContain('handle /admin /admin/*')
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
