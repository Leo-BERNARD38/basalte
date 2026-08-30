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
  readonly profile: SiteProfile
}

// Un profil est un jeu de réponses, jamais une branche : il choisit ce qui est
// écrit au premier jour — les capacités déclarées et les pages de départ — et
// rien du socle ne s’exécute différemment selon lui. C’est ce qui permet d’en
// ajouter sans multiplier ce qu’il y a à maintenir (D98).
export type Profile = {
  readonly label: string
  readonly capabilities: Readonly<Record<string, boolean>>
  /** Les pages qui s’ajoutent à celles de tout site. */
  readonly pages: (answers: SiteAnswers) => readonly GeneratedFile[]
}

export const PROFILES = {
  vitrine: {
    label: 'une page d’accueil, un formulaire, les documents légaux',
    capabilities: {},
    pages: () => [],
  },
  artisan: {
    label: 'la vitrine, plus une page de services et les devis en PDF',
    capabilities: { documents: true },
    pages: (answers: SiteAnswers) => [
      { path: 'content/services.json', contents: services(answers) },
    ],
  },
} satisfies Readonly<Record<string, Profile>>

export type SiteProfile = keyof typeof PROFILES

export const DEFAULT_PROFILE: SiteProfile = 'vitrine'

export function isProfile(name: string): name is SiteProfile {
  return Object.hasOwn(PROFILES, name)
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
    { path: 'content/mentions-legales.json', contents: notice(answers) },
    { path: 'content/confidentialite.json', contents: privacy(answers) },
    ...PROFILES[answers.profile].pages(answers),
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

  const declared = Object.entries(PROFILES[answers.profile].capabilities)

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
    '  // Ce que ce site fait, lu à l’exécution et modifiable après coup. Une',
    '  // capacité absente garde la valeur du socle : notifyLeads (oui),',
    '  // analytics (oui), documents (non), desktopRender (non).',
    ...(declared.length === 0
      ? ['  capabilities: {},']
      : [
          '  capabilities: {',
          ...declared.map(([name, value]) => `    ${name}: ${value},`),
          '  },',
        ]),
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
            'Vos coordonnées servent uniquement à répondre à ce message. Voir notre [politique de confidentialité](/confidentialite).',
          ),
        },
      },
    ],
  })
}

// Les deux documents que le droit réclame d’un site en ligne. Ce sont des
// pages ordinaires — le client les édite comme les autres — et leur texte est
// un canevas à compléter, pas un conseil juridique : les crochets nomment ce
// qui manque, et le premier paragraphe le dit.
function notice(answers: SiteAnswers): string {
  return document(
    answers,
    'Mentions légales',
    'Les informations légales du site : éditeur, hébergeur, propriété intellectuelle.',
    [
      CANVAS,
      '',
      '## Éditeur du site',
      '',
      '- [Raison sociale], [forme juridique] au capital de [montant] euros',
      '- Siège social : [adresse complète]',
      '- SIREN [numéro], immatriculée au RCS de [ville]',
      '- TVA intracommunautaire : [numéro]',
      '- Téléphone : [numéro] — email : [adresse]',
      '',
      '## Directeur de la publication',
      '',
      '[Prénom Nom], en qualité de [fonction].',
      '',
      '## Hébergement',
      '',
      'Le site est hébergé par [hébergeur], [adresse de l’hébergeur], [téléphone de l’hébergeur].',
      '',
      '## Propriété intellectuelle',
      '',
      'Les textes, les images et les éléments graphiques de ce site appartiennent à [Raison sociale], sauf mention contraire. Toute reproduction, même partielle, demande une autorisation écrite.',
      '',
      '## Nous joindre',
      '',
      'Pour toute question sur ce site : [adresse email], ou par le [formulaire de contact](/contact).',
    ],
  )
}

function privacy(answers: SiteAnswers): string {
  return document(
    answers,
    'Politique de confidentialité',
    'Ce que ce site collecte, pourquoi, combien de temps, et les droits qui vous restent.',
    [
      CANVAS,
      '',
      '## Qui traite vos données',
      '',
      '[Raison sociale], [adresse complète], répond des données recueillies sur ce site. Pour toute question : [adresse email].',
      '',
      '## Ce qui est collecté, et pourquoi',
      '',
      'Le formulaire de contact enregistre votre nom, votre adresse email et votre message. Ces données servent à vous répondre, et à rien d’autre. La base légale de ce traitement est votre consentement, donné en envoyant le formulaire.',
      '',
      'Le site ne dépose aucun cookie et n’embarque aucun traceur. La fréquentation est mesurée depuis les journaux du serveur, sur des adresses tronquées qui ne permettent pas de vous identifier.',
      '',
      '## Combien de temps',
      '',
      'Un message est conservé [douze] mois, puis effacé automatiquement.',
      '',
      '## Qui y a accès',
      '',
      '- [Raison sociale], pour vous répondre',
      '- [hébergeur], qui héberge le site',
      '- [fournisseur d’email], qui achemine les messages',
      '',
      'Aucune donnée n’est vendue ni cédée à un tiers.',
      '',
      '## Vos droits',
      '',
      'Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, ou vous opposer à leur traitement. Écrivez à [adresse email] : la réponse vous parvient sous un mois. Vous pouvez aussi saisir la CNIL.',
    ],
  )
}

// La page de services du profil artisan : trois points à renommer, pas trois
// points inventés. Le contenu de départ nomme ce qu’il attend.
function services(answers: SiteAnswers): string {
  const point = (title: string, body: string) => ({
    title: translated(answers, title),
    body: translated(answers, body),
  })

  return json({
    $format: CONTENT_FORMAT,
    meta: {
      title: translated(answers, 'Nos services'),
      description: translated(
        answers,
        'Ce que nous faisons, et sur quelle zone.',
      ),
    },
    blocks: [
      {
        id: 'services',
        type: 'features',
        props: {
          title: translated(answers, 'Ce que nous faisons'),
          items: [
            point(
              'Premier service',
              'Ce qu’il comprend, pour qui, et ce qui le distingue.',
            ),
            point('Deuxième service', 'Une phrase, deux au maximum.'),
            point(
              'Troisième service',
              'Remplace ces trois points par les tiens.',
            ),
          ],
        },
      },
    ],
  })
}

const CANVAS =
  'Ce texte est un canevas : il est à compléter et à relire, et il ne vaut pas conseil juridique.'

/** Une page d’un seul bloc de prose, titrée comme la page elle-même. */
function document(
  answers: SiteAnswers,
  title: string,
  description: string,
  body: readonly string[],
): string {
  return json({
    $format: CONTENT_FORMAT,
    meta: {
      title: translated(answers, title),
      description: translated(answers, description),
    },
    blocks: [
      {
        id: 'texte',
        type: 'richtext',
        props: {
          title: translated(answers, title),
          body: translated(answers, body.join('\n')),
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
