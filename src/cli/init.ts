// `basalte init` : le dépôt d’un nouveau site, en une commande.
//
// Trois questions, et rien d’autre à installer. Ce qui est écrit ne contient
// aucune logique du socle (invariant 8) : de la configuration, du contenu de
// départ, les fichiers de la machine, et le paquet Claude Code du site.

import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'

import { executables, siteFiles, writeSite } from '../client/create.js'
import {
  DEFAULT_PROFILE,
  isProfile,
  PROFILES,
  type SiteAnswers,
  type SiteProfile,
} from '../client/files.js'
import { installStarterMedia } from '../client/media.js'
import { runNpm } from '../client/npm.js'
import {
  attachRemote,
  createRemote,
  githubToken,
  initRepository,
  remoteOf,
} from '../client/repository.js'
import {
  isMistagged,
  isPublished,
  readSocle,
  remoteTags,
  type Socle,
  versionsOf,
} from '../client/socle.js'
import {
  fails,
  hasFlag,
  heading,
  line,
  optionValue,
  positionals,
  succeeds,
} from './args.js'
import { readEntries, writeAgentDoc } from './inventory.js'
import type { Result } from './run.js'

const VALUED = ['--name', '--domain', '--languages', '--profile', '--repo']

const SLUG = /^[a-z0-9][a-z0-9-]*$/

export async function init(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const slug = positionals(argv, VALUED)[0]

  if (slug === undefined || !SLUG.test(slug)) {
    return fails([
      'Il manque le nom du dossier : basalte init <nom>',
      'En minuscules, chiffres et tirets — c’est aussi le nom npm du dépôt.',
    ])
  }

  const root = path.join(cwd, slug)

  if (await occupied(root)) {
    return fails([`« ${slug} » existe déjà et n’est pas vide.`])
  }

  const asked = optionValue(argv, '--profile')

  if (asked !== undefined && !isProfile(asked)) {
    return fails([
      `« ${asked} » n’est pas un profil — les profils sont ${Object.keys(PROFILES).join(', ')}.`,
    ])
  }

  const answers = await ask(argv, slug)
  const socle = readSocle()
  const install = !hasFlag(argv, '--no-install')

  // Avant d’écrire quoi que ce soit : sans son tag, l’installation échouerait
  // après avoir posé une trentaine de fichiers, et le dossier resterait ni
  // installé ni versionné. Le dépôt client ne peut pas épingler ce qui n’est
  // pas publié.
  const publication = install ? await publicationOf(cwd, socle) : 'published'

  if (publication !== 'published') {
    return fails(missing(socle, publication))
  }

  const files = siteFiles(answers, socle)
  const lines = [...heading('init', answers.name)]

  await mkdir(root, { recursive: true })
  await writeSite(root, files)

  // Les images de départ ne peuvent pas passer par `writeSite`, qui écrit du
  // texte : elles sont ingérées, comme un téléversement le ferait.
  const media = await installStarterMedia(root, answers.languages)

  lines.push(line('ok', `${files.length} fichier(s) écrits dans « ${slug} »`))
  lines.push(
    line(
      'ok',
      `${Object.keys(media).length} images de départ dans la médiathèque`,
    ),
  )
  lines.push(
    line(
      'ok',
      `socle épinglé à la version ${socle.version}, astro ${socle.astro}`,
    ),
  )

  if (!install) {
    await writeAgentDoc(root, await readEntries(root))
    lines.push(line('warning', 'installation sautée — lance « npm install »'))
  } else {
    // npm parle sur le terminal pendant qu’il installe : ce qui précède est
    // écrit avant lui, et le rapport reprend là où il s’est arrêté.
    process.stdout.write(`${lines.join('\n')}\n\nInstallation…\n\n`)
    lines.length = 0

    const installed = await runNpm(root, ['install'])

    if (!installed.ok) {
      return fails([
        `L’installation a échoué dans « ${slug} ».`,
        'Les fichiers sont écrits : corrige la cause ci-dessus,',
        'puis relance « npm install » depuis le dossier.',
      ])
    }

    lines.push(line('ok', 'dépendances installées'))
  }

  await initRepository(root, executables(files), `basalte@${answers.domain}`)
  lines.push(line('ok', 'dépôt git créé, premier commit écrit'))

  lines.push(...(await remote(argv, root, answers)))

  lines.push('', `  cd ${slug}`, '  npm run dev', '')

  return succeeds(lines)
}

// Le listage est un appel réseau. Quand il échoue — pas de réseau, dépôt
// injoignable —, on n’en conclut rien : c’est `npm install` qui le dira, comme
// avant. Cette garde nomme un tag absent, elle ne remplace pas l’installation.
/**
 * Ce que le dépôt du socle dit de cette version. « injoignable » vaut
 * publiée : le réseau n’est pas une raison de refuser d’engendrer un dépôt,
 * et l’installation dira elle-même ce qu’elle n’a pas trouvé.
 */
type Publication = 'published' | 'missing' | 'mistagged'

async function publicationOf(cwd: string, socle: Socle): Promise<Publication> {
  try {
    const tags = await remoteTags(cwd, socle)

    if (isPublished(socle.version, versionsOf(tags))) return 'published'

    return isMistagged(socle.version, tags) ? 'mistagged' : 'missing'
  } catch {
    return 'published'
  }
}

function missing(socle: Socle, publication: Publication): readonly string[] {
  const written =
    'Rien n’a été écrit : un dépôt client épingle une version, et celle-là n’existe pas.'
  const escape =
    'Ou relance avec « --no-install » pour écrire le dépôt sans l’installer.'

  if (publication === 'mistagged') {
    return [
      `Le socle porte un tag « ${socle.version} », sans le « v » — il n’est pas lu.`,
      `${written} Un dépôt client s’installe par « v${socle.version} ».`,
      '',
      '  Depuis le socle :',
      `    git tag v${socle.version} ${socle.version}`,
      `    git push origin v${socle.version}`,
      '',
      escape,
    ]
  }

  return [
    `Le socle n’a pas de version « v${socle.version} » publiée sur ${socle.repository}.`,
    written,
    '',
    '  Depuis le socle :',
    `    git tag v${socle.version} && git push origin v${socle.version}`,
    '',
    escape,
  ]
}

async function remote(
  argv: readonly string[],
  root: string,
  answers: SiteAnswers,
): Promise<readonly string[]> {
  const slug = optionValue(argv, '--repo')

  if (slug === undefined) {
    return [
      '',
      '  Pour le dépôt distant :',
      `    gh repo create ${answers.slug} --private --source . --push`,
      '  ou, sans gh, crée-le sur GitHub puis :',
      `    git remote add origin ${remoteOf(`<compte>/${answers.slug}`).ssh}`,
      '    git push --set-upstream origin main',
    ]
  }

  const token = githubToken(process.env)

  if (token === undefined) {
    return [
      line(
        'warning',
        `« --repo » demande un GITHUB_TOKEN sur cette machine — dépôt distant non créé`,
      ),
    ]
  }

  const created = await createRemote(slug, token)

  await attachRemote(root, created)

  return [line('ok', `dépôt distant « ${created.slug} » créé et poussé`)]
}

async function ask(
  argv: readonly string[],
  slug: string,
): Promise<SiteAnswers> {
  const given = {
    name: optionValue(argv, '--name'),
    domain: optionValue(argv, '--domain'),
    languages: optionValue(argv, '--languages'),
    profile: optionValue(argv, '--profile'),
  }

  const silent = hasFlag(argv, '--yes') || !process.stdin.isTTY

  const answered = silent ? given : await prompt(given, slug)

  return {
    slug,
    name: fallback(answered.name, slug),
    domain: fallback(answered.domain, `${slug}.fr`),
    languages: codes(fallback(answered.languages, 'fr')),
    profile: profileOf(answered.profile),
  }
}

// Un profil inconnu tapé à la question ramène au défaut : la commande refuse
// déjà un `--profile` faux avant d’écrire quoi que ce soit.
function profileOf(answer: string | undefined): SiteProfile {
  const given = (answer ?? '').trim()

  return isProfile(given) ? given : DEFAULT_PROFILE
}

/** Une réponse vide vaut la valeur proposée entre crochets. */
function fallback(answer: string | undefined, proposed: string): string {
  const given = (answer ?? '').trim()

  return given === '' ? proposed : given
}

type Given = {
  name?: string | undefined
  domain?: string | undefined
  languages?: string | undefined
  profile?: string | undefined
}

async function prompt(given: Given, slug: string): Promise<Given> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    return {
      name: given.name ?? (await rl.question(`Nom affiché [${slug}] : `)),
      domain: given.domain ?? (await rl.question(`Domaine [${slug}.fr] : `)),
      languages:
        given.languages ??
        (await rl.question('Langues, la première par défaut [fr] : ')),
      profile: given.profile ?? (await rl.question(profileQuestion())),
    }
  } finally {
    rl.close()
  }
}

function profileQuestion(): string {
  const lines = Object.entries(PROFILES).map(
    ([name, profile]) => `  ${name} — ${profile.label}`,
  )

  return `\nProfil du site :\n${lines.join('\n')}\nLequel [${DEFAULT_PROFILE}] : `
}

function codes(declared: string): readonly string[] {
  const found = declared
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '')

  return found.length === 0 ? ['fr'] : found
}

async function occupied(root: string): Promise<boolean> {
  if (!existsSync(root)) return false

  return (await readdir(root)).length > 0
}
