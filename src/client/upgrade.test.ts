import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { tryGit } from '../server/git.js'
import { readNote } from './notes.js'
import { compareVersions, versionsAfter, type Socle } from './socle.js'
import { applyUpgrade, type Npm, type Upgrade } from './upgrade.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const SOCLE: Socle = {
  name: '@leobernard/basalte',
  version: '1.4.0',
  astro: '7.2.9',
  repository: 'Leo-BERNARD38/basalte',
}

const UPGRADE: Upgrade = {
  from: '1.4.0',
  to: '1.5.0',
  notes: [readNote('1.5.0', '## v1.5.0\n\n**Action requise :** aucune')],
}

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

/** Un npm qui n’installe rien, et qui échoue sur les commandes désignées. */
function npm(failing: readonly string[] = []) {
  const seen: string[] = []

  const run: Npm = (_cwd, args) => {
    seen.push(args.join(' '))

    return Promise.resolve(
      failing.some((needle) => args.join(' ').includes(needle))
        ? { ok: false, code: 1 }
        : { ok: true, code: 0 },
    )
  }

  return { run, seen }
}

/** Un dépôt jetable, avec son manifeste commité. */
async function repository(): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'update-'))

  roots.push(root)

  await writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: 'atelier',
        dependencies: {
          '@leobernard/basalte': 'github:Leo-BERNARD38/basalte#v1.4.0',
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  await writeFile(path.join(root, 'package-lock.json'), '{}\n', 'utf8')
  await mkdir(path.join(root, 'content'), { recursive: true })
  await writeFile(path.join(root, 'content', 'index.json'), '{}\n', 'utf8')
  await mkdir(path.join(root, '.claude'), { recursive: true })
  await writeFile(
    path.join(root, '.claude', 'basalte.md'),
    '# v1.4.0\n',
    'utf8',
  )

  await tryGit(root, ['init', '--quiet', '--initial-branch=main'])
  await tryGit(root, ['add', '--all'])
  await tryGit(root, [
    '-c',
    'user.name=banc',
    '-c',
    'user.email=banc@exemple.fr',
    'commit',
    '--quiet',
    '--message',
    'départ',
  ])

  return root
}

async function pinned(root: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(path.join(root, 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string> }

  return manifest.dependencies['@leobernard/basalte'] ?? ''
}

describe('choix de la version', () => {
  it('ordonne les versions par leurs nombres, pas par leurs lettres', () => {
    expect(['1.10.0', '1.9.0', '1.2.0'].toSorted(compareVersions)).toEqual([
      '1.2.0',
      '1.9.0',
      '1.10.0',
    ])
  })

  it('ne retient que ce qui est plus récent que l’installé', () => {
    expect(
      versionsAfter('1.4.0', ['1.3.0', '1.4.0', '1.5.0', '2.0.0']),
    ).toEqual(['1.5.0', '2.0.0'])
  })
})

describe('notes de version', () => {
  it('lit la ligne « Action requise »', () => {
    expect(readNote('1.5.0', '**Action requise :** manuelle').action).toBe(
      'manuelle',
    )
    expect(readNote('1.5.0', 'rien de tel').action).toBe('inconnue')
  })
})

describe('montée de version', () => {
  it('épingle, installe, migre, construit et commite', async () => {
    const root = await repository()
    const { run, seen } = npm()

    const steps = await applyUpgrade(root, UPGRADE, SOCLE, run)

    expect(steps.every((step) => step.ok)).toBe(true)
    expect(seen).toEqual([
      'install',
      'exec -- basalte migrate',
      'exec -- basalte check --build',
    ])
    expect(await pinned(root)).toBe('github:Leo-BERNARD38/basalte#v1.5.0')
  })

  it('emporte la doc régénérée dans le commit, pour ne pas salir l’arbre', async () => {
    const root = await repository()

    // Ce que fait le `postinstall` d’un dépôt client : réécrire la doc du
    // socle à la version qui vient d’être installée.
    const run: Npm = async (cwd, args) => {
      if (args[0] === 'install') {
        await writeFile(
          path.join(cwd, '.claude', 'basalte.md'),
          '# v1.5.0\n',
          'utf8',
        )
      }

      return { ok: true, code: 0 }
    }

    await applyUpgrade(root, UPGRADE, SOCLE, run)

    const status = await tryGit(root, ['status', '--porcelain'])

    expect(status.kind === 'done' && status.stdout.trim()).toBe('')
  })

  it('rend le dépôt à son état d’avant quand le build échoue', async () => {
    const root = await repository()
    const { run, seen } = npm(['check'])

    const steps = await applyUpgrade(root, UPGRADE, SOCLE, run)

    expect(steps.some((step) => !step.ok)).toBe(true)
    expect(steps.at(-1)?.label).toContain('état d’avant')
    expect(seen.at(-1)).toBe('ci')
    expect(await pinned(root)).toBe('github:Leo-BERNARD38/basalte#v1.4.0')
  })

  it('refuse de commencer sur un arbre qui porte des modifications', async () => {
    const root = await repository()

    await writeFile(path.join(root, 'content', 'index.json'), '{"a":1}', 'utf8')

    const { run, seen } = npm()
    const steps = await applyUpgrade(root, UPGRADE, SOCLE, run)

    expect(steps).toHaveLength(1)
    expect(steps[0]?.ok).toBe(false)
    expect(seen).toEqual([])
    expect(await pinned(root)).toBe('github:Leo-BERNARD38/basalte#v1.4.0')
  })

  it('refuse un dossier qui n’est pas la racine d’un dépôt', async () => {
    await mkdir(WORK, { recursive: true })

    const root = await mkdtemp(path.join(WORK, 'update-'))

    roots.push(root)

    const { run } = npm()
    const steps = await applyUpgrade(root, UPGRADE, SOCLE, run)

    expect(steps[0]?.detail).toContain('racine d’un dépôt')
  })
})
