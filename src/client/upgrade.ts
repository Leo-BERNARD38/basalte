// La montée de version d’un site : elle aboutit entièrement, ou le dépôt
// revient à l’état d’avant (D23). Un site à moitié migré est le pire état
// possible, et c’est celui qu’une suite d’étapes manuelles produit.
//
// Ce qui rend l’annulation totale est la garde de départ : l’arbre doit être
// propre. Rendre le dépôt à son état d’avant se réduit alors aux quelques
// chemins qu’elle touche, remis en place, et à une réinstallation.

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { CONTENT_DIR } from '../content/page.js'
import { writeJsonFile } from '../content/write.js'
import { isRepositoryRoot, missingIdentity, tryGit } from '../server/git.js'
import { AGENT_DOC } from './agent.js'
import { fetchNote, type ReleaseNote } from './notes.js'
import { runNpm, type Npm } from './npm.js'
import {
  publishedVersions,
  socleDependency,
  versionsAfter,
  type Socle,
} from './socle.js'

export const MANIFEST = 'package.json'
export const LOCKFILE = 'package-lock.json'

/**
 * Ce que la montée de version écrit, et ce qu’elle remet en place quand une
 * étape lâche. `.claude/basalte.md` en fait partie parce que l’installation le
 * régénère : le laisser hors du commit rendrait l’arbre sale sur la machine du
 * mainteneur comme sur le VPS, où un `git pull --ff-only` refuserait alors
 * d’avancer.
 */
const TOUCHED = [MANIFEST, LOCKFILE, CONTENT_DIR, AGENT_DOC]

export type Upgrade = {
  readonly from: string
  readonly to: string
  readonly notes: readonly ReleaseNote[]
}

export type UpgradeStep = {
  readonly label: string
  readonly ok: boolean
  readonly detail?: string
}

/** La version visée et ses notes, ou `undefined` quand le site est à jour. */
export async function planUpgrade(
  cwd: string,
  socle: Socle,
): Promise<Upgrade | undefined> {
  const pending = versionsAfter(
    socle.version,
    await publishedVersions(cwd, socle),
  )

  const to = pending.at(-1)

  if (to === undefined) return undefined

  return {
    from: socle.version,
    to,
    notes: await Promise.all(
      pending.map((version) => fetchNote(socle, version)),
    ),
  }
}

export async function applyUpgrade(
  cwd: string,
  upgrade: Upgrade,
  socle: Socle,
  npm: Npm = runNpm,
): Promise<readonly UpgradeStep[]> {
  const blocked = await blocking(cwd)

  if (blocked !== undefined)
    return [{ label: 'dépôt', ok: false, detail: blocked }]

  const done: UpgradeStep[] = [{ label: 'dépôt propre', ok: true }]

  for (const step of sequence(cwd, upgrade, socle, npm)) {
    const result = await step()

    done.push(result)

    if (!result.ok) {
      done.push(await revert(cwd, npm))
      break
    }
  }

  return done
}

function sequence(
  cwd: string,
  upgrade: Upgrade,
  socle: Socle,
  npm: Npm,
): readonly (() => Promise<UpgradeStep>)[] {
  return [
    async () => {
      await pin(cwd, socle, upgrade.to)

      return { label: `version épinglée à ${upgrade.to}`, ok: true }
    },
    () => step(npm, cwd, ['install'], 'dépendances installées'),
    () =>
      step(npm, cwd, ['exec', '--', 'basalte', 'migrate'], 'contenus migrés'),
    () =>
      step(
        npm,
        cwd,
        ['exec', '--', 'basalte', 'check', '--build'],
        'site construit',
      ),
    () => commit(cwd, upgrade.to),
  ]
}

/** Réécrit la dépendance du socle, sans toucher au reste du manifeste. */
export async function pin(
  cwd: string,
  socle: Socle,
  version: string,
): Promise<void> {
  const file = path.join(cwd, MANIFEST)
  const manifest = JSON.parse(await readFile(file, 'utf8')) as {
    dependencies?: Record<string, string>
  }

  manifest.dependencies = {
    ...manifest.dependencies,
    [socle.name]: socleDependency({ ...socle, version }),
  }

  await writeJsonFile(file, manifest)
}

async function step(
  npm: Npm,
  cwd: string,
  args: readonly string[],
  label: string,
): Promise<UpgradeStep> {
  const run = await npm(cwd, args)

  return run.ok
    ? { label, ok: true }
    : { label, ok: false, detail: `« npm ${args.join(' ')} » a échoué` }
}

/**
 * Ceux des chemins qui existent : git tient un motif sans correspondance pour
 * une erreur, et un dépôt n’a pas forcément tout ce que la liste nomme.
 */
function touched(cwd: string): readonly string[] {
  const found: string[] = []

  for (const entry of TOUCHED) {
    if (existsSync(path.join(cwd, entry))) found.push(entry)
  }

  return found
}

async function commit(cwd: string, version: string): Promise<UpgradeStep> {
  const added = await tryGit(cwd, ['add', '--', ...touched(cwd)])

  if (added.kind === 'failed') {
    return { label: 'commit', ok: false, detail: added.detail }
  }

  const written = await tryGit(cwd, [
    'commit',
    '--no-verify',
    '--message',
    `socle monté en v${version}`,
  ])

  return written.kind === 'done'
    ? { label: `commit « socle monté en v${version} »`, ok: true }
    : { label: 'commit', ok: false, detail: written.detail }
}

async function revert(cwd: string, npm: Npm): Promise<UpgradeStep> {
  const paths = touched(cwd)

  await tryGit(cwd, ['reset', '--quiet', '--', ...paths])
  await tryGit(cwd, ['checkout', '--', ...paths])

  const reinstalled = await npm(cwd, ['ci'])

  return {
    label: 'dépôt rendu à son état d’avant',
    ok: reinstalled.ok,
    ...(reinstalled.ok
      ? {}
      : { detail: 'la réinstallation a échoué — lance « npm ci » à la main.' }),
  }
}

/** Ce qui empêche de commencer, en une phrase, ou rien. */
async function blocking(cwd: string): Promise<string | undefined> {
  if (!(await isRepositoryRoot(cwd))) {
    return 'ce dossier n’est pas la racine d’un dépôt git : sans lui, rien ne pourrait être annulé.'
  }

  const status = await tryGit(cwd, ['status', '--porcelain'])

  if (status.kind === 'failed') return status.detail

  if (status.stdout.trim() !== '') {
    return 'l’arbre de travail porte des modifications : commite-les ou range-les, puis relance.'
  }

  return await missingIdentity(cwd)
}
