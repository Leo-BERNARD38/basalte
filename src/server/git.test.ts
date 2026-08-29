import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { commitFiles, isRepositoryRoot } from './git.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const EMAIL = 'client@exemple.fr'

const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

async function repository(options: { readonly git: boolean }): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'depot-'))

  created.push(root)

  await mkdir(path.join(root, 'content'), { recursive: true })
  await writeFile(path.join(root, 'content', 'index.json'), '{}\n', 'utf8')

  if (options.git) {
    git(root, ['init', '--quiet', '--initial-branch=main'])
    git(root, ['config', 'core.autocrlf', 'false'])
    git(root, ['add', '--all'])
    git(root, [
      '-c',
      'user.name=banc',
      '-c',
      `user.email=${EMAIL}`,
      'commit',
      '--quiet',
      '--message',
      'départ',
    ])
  }

  return root
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
}

describe('isRepositoryRoot', () => {
  it('reconnaît la racine d’un dépôt', async () => {
    expect(await isRepositoryRoot(await repository({ git: true }))).toBe(true)
  })

  it('refuse un dossier qui n’en est pas un', async () => {
    expect(await isRepositoryRoot(await repository({ git: false }))).toBe(false)
  })

  it('refuse un sous-dossier d’un dépôt', async () => {
    const root = await repository({ git: true })

    expect(await isRepositoryRoot(path.join(root, 'content'))).toBe(false)
  })
})

describe('commitFiles', () => {
  it('commite au nom du compte qui édite', async () => {
    const root = await repository({ git: true })

    await writeFile(
      path.join(root, 'content', 'index.json'),
      '{"a":1}\n',
      'utf8',
    )

    expect(
      await commitFiles(
        root,
        ['content/index.json'],
        'contenu : Accueil',
        EMAIL,
      ),
    ).toBe(true)

    expect(git(root, ['log', '-1', '--pretty=%s'])).toContain(
      'contenu : Accueil',
    )
    expect(git(root, ['log', '-1', '--pretty=%ae'])).toContain(EMAIL)
    expect(git(root, ['status', '--porcelain'])).toBe('')
  })

  it('ne commite rien quand rien n’a changé', async () => {
    const root = await repository({ git: true })

    expect(
      await commitFiles(root, ['content/index.json'], 'sans effet', EMAIL),
    ).toBe(false)

    expect(git(root, ['log', '--oneline']).trim().split('\n')).toHaveLength(1)
  })

  it('enregistre sans historique hors d’un dépôt', async () => {
    const root = await repository({ git: false })

    await writeFile(
      path.join(root, 'content', 'index.json'),
      '{"a":1}\n',
      'utf8',
    )

    expect(
      await commitFiles(root, ['content/index.json'], 'contenu', EMAIL),
    ).toBe(false)
  })

  it('accepte un chemin écrit avec les séparateurs du système', async () => {
    const root = await repository({ git: true })

    await writeFile(
      path.join(root, 'content', 'index.json'),
      '{"a":2}\n',
      'utf8',
    )

    expect(
      await commitFiles(
        root,
        [path.join('content', 'index.json')],
        'contenu',
        EMAIL,
      ),
    ).toBe(true)
  })

  it('retient la suppression d’un fichier', async () => {
    const root = await repository({ git: true })

    await rm(path.join(root, 'content', 'index.json'))

    expect(
      await commitFiles(root, ['content/index.json'], 'média supprimé', EMAIL),
    ).toBe(true)

    expect(git(root, ['status', '--porcelain'])).toBe('')
  })
})
