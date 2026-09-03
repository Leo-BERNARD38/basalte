import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { hasUpstream, pushToRemote, rebaseOnRemote } from './remote.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const EMAIL = 'client@exemple.fr'

const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
}

/** git écrit ses avertissements sur l’erreur standard ; les tests n’en veulent pas. */
function quiet(args: readonly string[]): void {
  execFileSync('git', [...args], { stdio: ['ignore', 'ignore', 'ignore'] })
}

async function temporary(prefix: string): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const directory = await mkdtemp(path.join(WORK, prefix))

  created.push(directory)

  return directory
}

async function commit(root: string, text: string, message: string) {
  await writeFile(path.join(root, 'content.txt'), `${text}\n`, 'utf8')

  git(root, ['add', '--all'])
  git(root, [
    '-c',
    'user.name=banc',
    '-c',
    `user.email=${EMAIL}`,
    'commit',
    '--quiet',
    '--message',
    message,
  ])
}

/** Un dépôt nu qui sert de distant, et deux clones qui le suivent. */
async function paired(): Promise<{
  readonly origin: string
  readonly site: string
  readonly other: string
}> {
  const origin = await temporary('origin-')

  quiet(['init', '--bare', '--initial-branch=main', origin])

  const site = await temporary('site-')
  const other = await temporary('autre-')

  quiet(['clone', origin, site])
  git(site, ['config', 'core.autocrlf', 'false'])

  await commit(site, 'départ', 'départ')

  git(site, ['push', '--quiet', '--set-upstream', 'origin', 'main'])
  quiet(['clone', origin, other])
  git(other, ['config', 'core.autocrlf', 'false'])

  return { origin, site, other }
}

describe('hasUpstream', () => {
  it('reconnaît un dépôt qui suit une branche distante', async () => {
    const { site } = await paired()

    expect(await hasUpstream(site)).toBe(true)
  })

  it('refuse un dossier qui n’est pas la racine d’un dépôt', async () => {
    const { site } = await paired()

    await mkdir(path.join(site, 'content'), { recursive: true })

    // Le point dur : git répond pour le dépôt le plus proche au-dessus. Sans
    // la garde, publier un sous-dossier pousserait le dépôt qui l’héberge.
    expect(await hasUpstream(path.join(site, 'content'))).toBe(false)
  })

  it('refuse un dépôt sans distant', async () => {
    const alone = await temporary('seul-')

    quiet(['init', '--initial-branch=main', alone])

    expect(await hasUpstream(alone)).toBe(false)
  })
})

describe('rebaseOnRemote', () => {
  it('reprend ce qui a été poussé ailleurs', async () => {
    const { site, other } = await paired()

    await writeFile(path.join(other, 'bloc.txt'), 'sur mesure\n', 'utf8')
    await commit(other, 'départ', 'un bloc sur mesure')
    git(other, ['push', '--quiet'])

    expect(await rebaseOnRemote(site, EMAIL)).toEqual({ kind: 'done' })
    expect(git(site, ['log', '--oneline']).trim().split('\n')).toHaveLength(2)
  })

  it('s’arrête sur un conflit, et laisse le dépôt propre', async () => {
    const { site, other } = await paired()

    await commit(other, 'depuis ta machine', 'ta version')
    git(other, ['push', '--quiet'])

    await commit(site, 'depuis le panel', 'la version du client')

    const result = await rebaseOnRemote(site, EMAIL)

    expect(result.kind).toBe('failed')

    // Un dépôt laissé au milieu d’un rebase ferait échouer le prochain
    // enregistrement du client sans qu’il comprenne pourquoi.
    expect(git(site, ['status', '--porcelain'])).toBe('')
    expect(git(site, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()).toBe('main')

    await rm(path.join(site, '.git', 'rebase-merge'), {
      recursive: true,
      force: true,
    }).catch(() => undefined)
  })

  it('ne touche à rien quand aucun distant ne suit', async () => {
    const alone = await temporary('seul-')

    quiet(['init', '--initial-branch=main', alone])

    expect(await rebaseOnRemote(alone, EMAIL)).toEqual({ kind: 'absent' })
  })
})

describe('pushToRemote', () => {
  it('pousse ce que le panel a commité', async () => {
    const { site, other } = await paired()

    await commit(site, 'un texte du client', 'contenu : Accueil')

    expect(await pushToRemote(site)).toEqual({ kind: 'done' })

    git(other, ['fetch', '--quiet'])

    expect(git(other, ['log', '--oneline', 'origin/main'])).toContain(
      'contenu : Accueil',
    )
  })

  it('rend l’échec plutôt que de le lever quand le distant a disparu', async () => {
    const { origin, site } = await paired()

    await commit(site, 'un texte', 'contenu')
    await rm(origin, { recursive: true, force: true })

    const result = await pushToRemote(site)

    expect(result.kind).toBe('failed')
  })

  it('ne pousse rien sans distant', async () => {
    const alone = await temporary('seul-')

    quiet(['init', '--initial-branch=main', alone])

    expect(await pushToRemote(alone)).toEqual({ kind: 'absent' })
  })
})
