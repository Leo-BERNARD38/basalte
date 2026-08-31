// `basalte release` : publier une version du socle, ou n’avoir rien publié.
//
// Le tag est la publication. Ni le numéro de `package.json`, ni la note, ni un
// commit sur `main` ne le sont : un dépôt client s’installe par
// `github:<compte>/basalte#vX.Y.Z` (D5), et ce que ce tag ne désigne pas
// n’existe pas pour lui. Bumper sans taguer est donc la panne de cette
// mécanique, et elle est différée — le socle continue de fonctionner, `verify`
// passe, et c’est `init` qui tombe, chez un client.
//
// D’où la forme : les gardes d’abord, toutes avant la moindre écriture, puis
// une suite d’étapes qui se défont jusqu’au push. C’est la même que celle
// d’`applyUpgrade`, pour la même raison — un geste à moitié fait est le pire
// des états.

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { noteFile, readNote, type Action } from '../client/notes.js'
import { runNpm, type Npm } from '../client/npm.js'
import {
  compareVersions,
  lines,
  remoteTags,
  versionsOf,
  type Socle,
} from '../client/socle.js'
import { isRepositoryRoot, missingIdentity, tryGit } from '../server/git.js'

const BRANCH = 'main'
const MANIFEST = 'package.json'
const LOCKFILE = 'package-lock.json'
const SEMVER = /^\d+\.\d+\.\d+$/

export const RANKS = ['patch', 'minor', 'major'] as const

export type Rank = (typeof RANKS)[number]

/** Les tags du dépôt du socle, injectables — le banc n’a pas de réseau. */
export type Tags = (cwd: string, socle: Socle) => Promise<readonly string[]>

export type Release = {
  readonly from: string
  readonly to: string
  readonly tag: string
  /** Le chemin de la note, relatif à la racine. */
  readonly note: string
  readonly action?: Action
}

export type Plan =
  | { readonly kind: 'blocked'; readonly reason: string }
  /** La note reste à écrire : le gabarit est rendu, rien n’est publié. */
  | {
      readonly kind: 'draft'
      readonly release: Release
      readonly template: string
      /** Les sujets de commit depuis le dernier tag, ou rien s’il est absent. */
      readonly since?: readonly string[]
    }
  | { readonly kind: 'ready'; readonly release: Release }

export type ReleaseStep = {
  readonly label: string
  readonly ok: boolean
  readonly detail?: string
}

/**
 * La version que ce rang désigne. Un rang part de la dernière version publiée,
 * jamais du numéro que porte le dépôt : c’est ce qui rend deux publications
 * successives déterministes, même quand la précédente a laissé le manifeste en
 * avance.
 */
export function nextVersion(
  published: string,
  target: string,
): string | undefined {
  if (SEMVER.test(target)) return target

  const [major = 0, minor = 0, patch = 0] = published
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)

  if (target === 'patch') return `${major}.${minor}.${patch + 1}`
  if (target === 'minor') return `${major}.${minor + 1}.0`
  if (target === 'major') return `${major + 1}.0.0`

  return undefined
}

/**
 * Écrit le gabarit et rend son chemin. La note est le seul morceau de ce geste
 * qu’aucune commande ne sait rédiger : le rang et l’effet sur un site existant
 * sont un jugement, et le gabarit reste invalide tant qu’il n’est pas porté.
 */
export async function writeNote(
  cwd: string,
  release: Release,
  template: string,
): Promise<string> {
  await writeFile(path.join(cwd, release.note), template, 'utf8')

  return release.note
}

/** Le gabarit d’une note, aux trois titres figés que `update` sait lire (D90). */
export function noteTemplate(version: string): string {
  return [
    `## v${version}`,
    '',
    '**Action requise :** à remplir — aucune, automatique ou manuelle',
    '',
    '### Ce qui change',
    '',
    '- ',
    '',
    '### Migration de contenu',
    '',
    'Aucune.',
    '',
    '### À faire dans le dépôt client',
    '',
    'Rien.',
    '',
  ].join('\n')
}

export async function planRelease(
  cwd: string,
  socle: Socle,
  target: string,
  tagsOf: Tags = remoteTags,
): Promise<Plan> {
  const blocked = await blocking(cwd, socle)

  if (blocked !== undefined) return { kind: 'blocked', reason: blocked }

  const tags = await tagsOf(cwd, socle)
  const published = versionsOf(tags)
  const last = published.at(-1) ?? '0.0.0'
  const ahead = compareVersions(socle.version, last) > 0

  if (compareVersions(socle.version, last) < 0) {
    return {
      kind: 'blocked',
      reason: `le dépôt porte v${socle.version} alors que v${last} est publiée : « git pull » avant de publier.`,
    }
  }

  const to = ahead ? socle.version : nextVersion(last, target)

  if (to === undefined) {
    return {
      kind: 'blocked',
      reason: `« ${target} » n’est ni un rang (${RANKS.join(', ')}) ni un numéro « X.Y.Z ».`,
    }
  }

  if (ahead && target !== to) {
    return {
      kind: 'blocked',
      reason: `le manifeste porte déjà v${socle.version}, qui n’est pas publiée — c’est elle qu’il reste à taguer : « basalte release ${socle.version} ».`,
    }
  }

  if (compareVersions(to, last) <= 0) {
    return {
      kind: 'blocked',
      reason: `v${to} n’est pas postérieure à v${last}, la dernière publiée.`,
    }
  }

  const tag = `v${to}`

  if ((await tryGit(cwd, ['rev-parse', '--verify', tag])).kind === 'done') {
    return {
      kind: 'blocked',
      reason: `le tag « ${tag} » existe déjà dans ce clone : « git tag -d ${tag} » s’il est de trop.`,
    }
  }

  const note = noteFile(to)
  const release: Release = { from: socle.version, to, tag, note }
  const dirty = await unclean(cwd, note)

  if (dirty !== undefined) return { kind: 'blocked', reason: dirty }

  if (!existsSync(path.join(cwd, note))) {
    const since = await commitsSince(cwd, `v${last}`)

    return {
      kind: 'draft',
      release,
      template: noteTemplate(to),
      ...(since === undefined ? {} : { since }),
    }
  }

  const written = readNote(to, await readFile(path.join(cwd, note), 'utf8'))

  if (written.action === 'inconnue') {
    return {
      kind: 'blocked',
      reason: `« ${note} » ne dit pas son action requise : la ligne « **Action requise :** » vaut aucune, automatique ou manuelle, et rien d’autre.`,
    }
  }

  if (written.action === 'manuelle' && !isMajor(last, to)) {
    return {
      kind: 'blocked',
      reason: `« ${note} » demande une action manuelle : un site existant a quelque chose à toucher, et cela se publie en majeure, pas en v${to}.`,
    }
  }

  return { kind: 'ready', release: { ...release, action: written.action } }
}

export async function applyRelease(
  cwd: string,
  release: Release,
  npm: Npm = runNpm,
): Promise<readonly ReleaseStep[]> {
  const done: ReleaseStep[] = []
  const state = { bumped: false, committed: false, tagged: false }

  for (const step of sequence(cwd, release, npm, state)) {
    const result = await step()

    done.push(result)

    if (!result.ok) {
      done.push(await revert(cwd, release, state))
      break
    }
  }

  return done
}

function sequence(
  cwd: string,
  release: Release,
  npm: Npm,
  state: { bumped: boolean; committed: boolean; tagged: boolean },
): readonly (() => Promise<ReleaseStep>)[] {
  return [
    async () => {
      const run = await npm(cwd, ['run', 'verify'])

      return run.ok
        ? { label: 'verify passé', ok: true }
        : {
            label: 'verify',
            ok: false,
            detail: 'il doit passer avant tout le reste.',
          }
    },
    async () => {
      const run = await npm(cwd, [
        'version',
        release.to,
        '--no-git-tag-version',
      ])

      if (!run.ok) {
        return {
          label: 'numéro porté',
          ok: false,
          detail: '« npm version » a échoué',
        }
      }

      state.bumped = true

      const carried = await carries(cwd, release.to)

      return carried === undefined
        ? { label: `numéro porté à ${release.to}`, ok: true }
        : { label: 'numéro porté', ok: false, detail: carried }
    },
    async () => {
      const added = await tryGit(cwd, [
        'add',
        '--',
        MANIFEST,
        LOCKFILE,
        release.note,
      ])

      if (added.kind === 'failed') {
        return { label: 'commit', ok: false, detail: added.detail }
      }

      // `verify` vient de passer sur ce même arbre, et il couvre strictement
      // plus que les hooks : les rejouer ne dirait rien de neuf.
      const written = await tryGit(cwd, [
        'commit',
        '--no-verify',
        '--message',
        `release: ${release.tag}`,
      ])

      if (written.kind === 'failed') {
        return { label: 'commit', ok: false, detail: written.detail }
      }

      state.committed = true

      return { label: `commit « release: ${release.tag} »`, ok: true }
    },
    async () => {
      const tagged = await tryGit(cwd, [
        'tag',
        '--annotate',
        '--message',
        release.tag,
        release.tag,
      ])

      if (tagged.kind === 'failed') {
        return { label: 'tag', ok: false, detail: tagged.detail }
      }

      state.tagged = true

      return { label: `tag ${release.tag}`, ok: true }
    },
    async () => {
      // Les deux références sont nommées, et « --atomic » les fait avancer
      // ensemble ou pas du tout. « --follow-tags » ne suffirait pas : il
      // n’emporte que les tags annotés, et une branche poussée sans son tag
      // est précisément la panne que cette commande existe pour empêcher.
      const pushed = await tryGit(cwd, [
        'push',
        '--no-verify',
        '--atomic',
        'origin',
        BRANCH,
        release.tag,
      ])

      return pushed.kind === 'done'
        ? { label: `${BRANCH} et ${release.tag} poussés`, ok: true }
        : { label: 'push', ok: false, detail: pushed.detail }
    },
  ]
}

/**
 * Rend le dépôt à son état d’avant. La note en est exclue : elle a été écrite à
 * la main, et une commande qui l’effacerait ferait perdre le seul travail de
 * ce geste qu’elle ne sait pas refaire.
 */
async function revert(
  cwd: string,
  release: Release,
  state: { bumped: boolean; committed: boolean; tagged: boolean },
): Promise<ReleaseStep> {
  if (state.tagged) await tryGit(cwd, ['tag', '--delete', release.tag])
  if (state.committed)
    await tryGit(cwd, ['reset', '--quiet', '--soft', 'HEAD~1'])

  await tryGit(cwd, [
    'reset',
    '--quiet',
    '--',
    MANIFEST,
    LOCKFILE,
    release.note,
  ])

  if (state.bumped) {
    await tryGit(cwd, ['checkout', '--', MANIFEST, LOCKFILE])
  }

  return {
    label: `rien n’est publié — le dépôt est comme avant, « ${release.note} » compris`,
    ok: true,
  }
}

/**
 * Ce qui traîne dans l’arbre, hors la note de cette version. Elle en est
 * exclue parce qu’elle est le seul fichier que ce geste attend non commité :
 * la première passe l’ébauche, la main la remplit, la seconde la publie. Sans
 * cette exception, la commande refuserait le travail qu’elle vient elle-même
 * de demander.
 */
async function unclean(cwd: string, note: string): Promise<string | undefined> {
  // « --untracked-files=all » n’est pas un détail : sans lui git replie un
  // dossier entier non suivi en une seule ligne, et la note ne pourrait plus
  // être reconnue parmi ce qui traîne.
  const status = await tryGit(cwd, [
    'status',
    '--porcelain',
    '--untracked-files=all',
  ])

  if (status.kind === 'failed') return status.detail

  const straggling = lines(status.stdout)
    .filter((entry) => entry.trim() !== '')
    .map((entry) => entry.slice(3).trim())
    .filter((file) => file !== note)

  return straggling.length === 0
    ? undefined
    : `l’arbre de travail porte des modifications — ${straggling.slice(0, 3).join(', ')}${straggling.length > 3 ? '…' : ''} : commite-les ou range-les, puis relance.`
}

/** Ce qui empêche de commencer, en une phrase, ou rien. */
async function blocking(
  cwd: string,
  socle: Socle,
): Promise<string | undefined> {
  if (!(await isRepositoryRoot(cwd))) {
    return 'ce dossier n’est pas la racine d’un dépôt git.'
  }

  if (!(await isSocleRoot(cwd, socle))) {
    return `ce dossier n’est pas le dépôt du socle : « ${socle.name} » s’y publie, un site s’y installe. Depuis un site, c’est « npm run update ».`
  }

  const branch = await tryGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])

  if (branch.kind === 'failed') return branch.detail

  if (branch.stdout.trim() !== BRANCH) {
    return `la publication part de « ${BRANCH} », et ce clone est sur « ${branch.stdout.trim()} ».`
  }

  // Best effort : un clone sans distant, ou dont la référence n’a jamais été
  // rapatriée, ne rend rien ici. Ce qui garde vraiment est le push — refusé
  // s’il n’avance pas, et l’annulation défait alors le commit et le tag.
  const behind = await tryGit(cwd, [
    'rev-list',
    '--count',
    `HEAD..origin/${BRANCH}`,
  ])

  if (behind.kind === 'done' && behind.stdout.trim() !== '0') {
    return `origin/${BRANCH} porte ${behind.stdout.trim()} commit(s) que ce clone n’a pas : « git pull », puis relance.`
  }

  return await missingIdentity(cwd)
}

/**
 * Vrai quand ce dossier est le dépôt du socle lui-même. Le manifeste que
 * `readSocle` lit est celui du paquet : dans un dépôt client, c’est celui
 * installé sous `node_modules`, et il ne porte pas le nom du site.
 */
export async function isSocleRoot(cwd: string, socle: Socle): Promise<boolean> {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(cwd, MANIFEST), 'utf8'),
    ) as { readonly name?: string }

    return manifest.name === socle.name
  } catch {
    return false
  }
}

/** Ce que le manifeste et le verrou ne portent pas encore, ou rien. */
async function carries(
  cwd: string,
  version: string,
): Promise<string | undefined> {
  for (const file of [MANIFEST, LOCKFILE]) {
    const read = JSON.parse(await readFile(path.join(cwd, file), 'utf8')) as {
      readonly version?: string
    }

    if (read.version !== version) {
      return `« ${file} » porte ${read.version ?? 'aucune version'} et non ${version}`
    }
  }

  return undefined
}

/** Les sujets de commit depuis ce tag, ou rien s’il n’est pas dans ce clone. */
async function commitsSince(
  cwd: string,
  tag: string,
): Promise<readonly string[] | undefined> {
  const listed = await tryGit(cwd, [
    'log',
    '--format=%s',
    '--no-merges',
    `${tag}..HEAD`,
  ])

  if (listed.kind === 'failed') return undefined

  return lines(listed.stdout).filter((subject) => subject.trim() !== '')
}

function isMajor(from: string, to: string): boolean {
  return (from.split('.')[0] ?? '0') !== (to.split('.')[0] ?? '0')
}
