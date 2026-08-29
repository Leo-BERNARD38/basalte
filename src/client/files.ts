// Les fichiers qu’un dépôt client contient au premier jour. Aucun ne porte de
// logique du socle (invariant 8) : de la configuration, du contenu, et de quoi
// lancer les cinq commandes.
//
// Ils sont produits en mémoire puis écrits d’un bloc, ce qui laisse `init` les
// vérifier avant de toucher au disque et un test les lire sans en écrire un
// seul.

import { CONTENT_FORMAT } from '../content/page.js'
import { VARIABLES } from '../server/email/provider.js'
import { socleDependency, type Socle } from './socle.js'

export type SiteAnswers = {
  /** Le dossier, et le nom npm du dépôt. */
  readonly slug: string
  readonly name: string
  readonly domain: string
  /** Les codes de langue, la première étant celle par défaut. */
  readonly languages: readonly string[]
}

export type GeneratedFile = {
  /** Chemin relatif à la racine, en séparateurs `/`. */
  readonly path: string
  readonly contents: string
  /** Un hook git n’est lu que s’il est exécutable. */
  readonly executable?: boolean
}

const NODE = '>=24.0.0 <25'

export function clientFiles(
  answers: SiteAnswers,
  socle: Socle,
): readonly GeneratedFile[] {
  return [
    { path: 'package.json', contents: manifest(answers, socle) },
    { path: 'astro.config.mjs', contents: astroConfig() },
    { path: 'site.config.ts', contents: siteConfig(answers) },
    { path: 'tsconfig.json', contents: tsconfig() },
    { path: '.nvmrc', contents: '24\n' },
    { path: '.npmrc', contents: 'save-exact=true\nengine-strict=true\n' },
    { path: '.gitignore', contents: gitignore() },
    { path: '.gitattributes', contents: '* text=auto eol=lf\n' },
    { path: '.env', contents: environment() },
    { path: '.env.example', contents: environment() },
    { path: '.githooks/pre-commit', contents: preCommit(), executable: true },
    { path: 'content/index.json', contents: home(answers) },
    { path: 'content/contact.json', contents: contact(answers) },
    { path: 'content/media.json', contents: json({}) },
    { path: 'public/media/.gitkeep', contents: '' },
    { path: 'src/blocks/.gitkeep', contents: '' },
  ]
}

function manifest(answers: SiteAnswers, socle: Socle): string {
  return json({
    name: answers.slug,
    private: true,
    type: 'module',
    engines: { node: NODE },
    scripts: {
      dev: 'astro dev',
      check: 'basalte check',
      deploy: 'basalte deploy',
      doctor: 'basalte doctor',
      update: 'basalte update',
      postinstall: 'basalte inventory --agent',
    },
    dependencies: {
      [socle.name]: socleDependency(socle),
      astro: socle.astro,
    },
  })
}

function astroConfig(): string {
  return [
    "import { defineConfig } from 'astro/config'",
    "import basalte from '@leobernard/basalte/astro'",
    '',
    'export default defineConfig({ integrations: [basalte()] })',
    '',
  ].join('\n')
}

function siteConfig(answers: SiteAnswers): string {
  const languages = answers.languages.map((code, index) =>
    index === 0
      ? `    ${code}: { default: true },`
      : `    ${code}: { draft: true },`,
  )

  return [
    "import { defineSite } from '@leobernard/basalte'",
    '',
    'export default defineSite({',
    `  name: ${quoted(answers.name)},`,
    `  domain: ${quoted(answers.domain)},`,
    '  languages: {',
    ...languages,
    '  },',
    "  email: { provider: 'brevo' },",
    '  leads: { purgeAfterMonths: 12 },',
    '  // La direction artistique du site. Un token non déclaré garde la valeur',
    '  // du socle — voir la skill « design ».',
    '  tokens: {',
    '    color: {',
    "      accent: '#1f57ff',",
    '    },',
    '  },',
    '})',
    '',
  ].join('\n')
}

function tsconfig(): string {
  return json({
    extends: 'astro/tsconfigs/strict',
    include: ['.astro/types.d.ts', '**/*'],
    exclude: ['dist', '.basalte'],
  })
}

function gitignore(): string {
  return [
    'node_modules/',
    'dist/',
    '.astro/',
    '.basalte/',
    '*.tsbuildinfo',
    '',
    '.env',
    '',
    'data/',
    '*.db',
    '*.db-journal',
    '*.db-wal',
    '',
  ].join('\n')
}

// Les six variables viennent de la table du socle, jamais d’une liste recopiée
// ici : en ajouter une met à jour le `.env` de chaque nouveau site.
function environment(): string {
  const help: ReadonlyArray<readonly [string, string]> = [
    [VARIABLES.key, 'la clé du fournisseur d’email'],
    [VARIABLES.from, 'l’adresse qui expédie les emails du site'],
    [VARIABLES.contact, 'où arrivent les messages du formulaire'],
    [VARIABLES.admin, 'où partent les erreurs de la machine'],
    [VARIABLES.authKey, 'facultatif — le canal des codes de connexion'],
    [VARIABLES.authFrom, 'facultatif — l’expéditeur de ces codes'],
  ]

  return [
    '# Les secrets du site. Ce fichier n’est jamais versionné.',
    '# « basalte doctor » dit ce qui manque, et prouve ce qui est rempli.',
    '',
    ...help.map(([name, line]) => `# ${line}\n${name}=\n`),
  ].join('\n')
}

function preCommit(): string {
  return ['#!/bin/sh', 'set -e', '', 'npx basalte check', ''].join('\n')
}

function home(answers: SiteAnswers): string {
  return json({
    $format: CONTENT_FORMAT,
    meta: {
      title: translated(answers, answers.name),
      description: translated(
        answers,
        'La description que Google affiche sous le titre. Deux lignes suffisent.',
      ),
    },
    blocks: [
      {
        id: 'hero',
        type: 'hero',
        props: {
          title: translated(answers, answers.name),
          subtitle: translated(
            answers,
            'La phrase qui dit ce que vous faites, et pour qui.',
          ),
          cta: {
            label: translated(answers, 'Nous écrire'),
            href: '/contact',
          },
        },
      },
      {
        id: 'presentation',
        type: 'richtext',
        props: {
          title: translated(answers, 'À propos'),
          body: translated(
            answers,
            'Ce texte accepte du **gras**, de l’*italique* et des [liens](https://exemple.fr).',
          ),
        },
      },
    ],
  })
}

function contact(answers: SiteAnswers): string {
  return json({
    $format: CONTENT_FORMAT,
    meta: {
      title: translated(answers, 'Nous contacter'),
      description: translated(
        answers,
        'Écrivez-nous : nous répondons sous quelques jours.',
      ),
    },
    blocks: [
      {
        id: 'formulaire',
        type: 'contact',
        props: {
          title: translated(answers, 'Nous écrire'),
          consent: translated(
            answers,
            'Vos coordonnées servent uniquement à répondre à ce message.',
          ),
        },
      },
    ],
  })
}

/** Une carte de langues, remplie dans la langue par défaut et vide ailleurs (D41). */
function translated(
  answers: SiteAnswers,
  value: string,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    answers.languages.map((code, index) => [code, index === 0 ? value : '']),
  )
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

/** Une chaîne TypeScript à l’apostrophe droite, comme le reste du dépôt. */
function quoted(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}
