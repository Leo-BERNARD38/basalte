import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import type { Npm } from '../client/npm.js'
import type { Socle } from '../client/socle.js'
import { tryGit } from '../server/git.js'
import {
  applyRelease,
  nextVersion,
  noteTemplate,
  planRelease,
  writeNote,
  type Plan,
  type Tags,
} from './release.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const SOCLE: Socle = {
  name: '@leobernard/basalte',
  version: '0.1.0',
  astro: '7.2.9',
  repository: 'Leo-BERNARD38/basalte',
}

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

/** Les tags que le distant porterait, sans jamais l’appeler. */
function tags(...published: readonly string[]): Tags {
  return () => Promise.resolve(published)
}

/**
 * Un npm qui n’installe rien, mais qui porte vraiment le numéro : c’est ce que
 * `npm version` fait, et l’étape suivante le relit avant de commiter.
 */
function npm(failing?: string) {
  const seen: string[] = []

  const run: Npm = async (cwd, args) => {
    seen.push(args.join(' '))

    if (failing !== undefined && args.join(' ').includes(failing)) {
      return { ok: false, code: 1 }
    }

    if (args[0] === 'version') {
      await bump(cwd, args[1] ?? '')
    }

    return { ok: true, code: 0 }
  }

  return { run, seen }
}

async function bump(root: string, version: string): Promise<void> {
  for (const file of ['package.json', 'package-lock.json']) {
    const full = path.join(root, file)
    const manifest = JSON.parse(await readFile(full, 'utf8')) as Record<
      string,
      unknown
    >

    await writeFile(
      full,
      `${JSON.stringify({ ...manifest, version }, null, 2)}\n`,
      'utf8',
    )
  }
}

/** Le dépôt du socle, en jetable, avec un distant qui accepte le push. */
async function socleRepository(version = '0.1.0'): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const root = await mkdtemp(path.join(WORK, 'release-'))
  const remote = await mkdtemp(path.join(WORK, 'remote-'))

  roots.push(root, remote)

  for (const file of ['package.json', 'package-lock.json']) {
    await writeFile(
      path.join(root, file),
      `${JSON.stringify({ name: SOCLE.name, version }, null, 2)}\n`,
      'utf8',
    )
  }

  await mkdir(path.join(root, 'notes'), { recursive: true })
  await writeFile(
    path.join(root, 'notes', 'v0.1.0.md'),
    '## v0.1.0\n\n**Action requise :** aucune\n',
    'utf8',
  )

  await tryGit(remote, ['init', '--quiet', '--bare', '--initial-branch=main'])
  await tryGit(root, ['init', '--quiet', '--initial-branch=main'])
  await tryGit(root, ['config', 'user.name', 'banc'])
  await tryGit(root, ['config', 'user.email', 'banc@exemple.fr'])
  await tryGit(root, ['remote', 'add', 'origin', remote])
  await tryGit(root, ['add', '--all'])
  await tryGit(root, ['commit', '--quiet', '--message', 'départ'])
  await tryGit(root, ['push', '--quiet', 'origin', 'main'])

  return root
}

async function note(root: string, version: string, action: string) {
  await writeFile(
    path.join(root, 'notes', `v${version}.md`),
    `## v${version}\n\n**Action requise :** ${action}\n`,
    'utf8',
  )
}

function reason(plan: Plan): string {
  return plan.kind === 'blocked' ? plan.reason : `non bloqué (${plan.kind})`
}

describe('choix du numéro', () => {
  it('incrémente le rang demandé, et rend un numéro tel quel', () => {
    expect(nextVersion('1.4.2', 'patch')).toBe('1.4.3')
    expect(nextVersion('1.4.2', 'minor')).toBe('1.5.0')
    expect(nextVersion('1.4.2', 'major')).toBe('2.0.0')
    expect(nextVersion('1.4.2', '3.0.1')).toBe('3.0.1')
  })

  it('ne rend rien pour ce qui n’est ni un rang ni un numéro', () => {
    expect(nextVersion('1.4.2', 'beta')).toBeUndefined()
    expect(nextVersion('1.4.2', '1.4')).toBeUndefined()
  })
})

describe('gabarit de note', () => {
  it('porte les trois titres figés, et reste invalide tant qu’il n’est pas rempli', () => {
    const template = noteTemplate('1.5.0')

    expect(template).toContain('### Ce qui change')
    expect(template).toContain('### Migration de contenu')
    expect(template).toContain('### À faire dans le dépôt client')
    expect(template).toContain('**Action requise :** à remplir')
  })
})

describe('ce que la publication refuse', () => {
  it('refuse un dossier qui n’est pas le dépôt du socle', async () => {
    const root = await socleRepository()

    await writeFile(
      path.join(root, 'package.json'),
      '{ "name": "atelier", "version": "1.0.0" }\n',
      'utf8',
    )
    await tryGit(root, ['commit', '--quiet', '--all', '--message', 'site'])

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('dépôt du socle')
  })

  it('refuse un arbre qui porte des modifications', async () => {
    const root = await socleRepository()

    await writeFile(path.join(root, 'notes', 'brouillon.md'), 'x', 'utf8')

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('modifications')
  })

  it('refuse de publier depuis une autre branche que main', async () => {
    const root = await socleRepository()

    await tryGit(root, ['checkout', '--quiet', '-b', 'brouillon'])

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('brouillon')
  })

  it('refuse un numéro qui n’est pas postérieur à la dernière publiée', async () => {
    const root = await socleRepository('0.1.0')

    const plan = await planRelease(root, SOCLE, '0.1.0', tags('v0.1.0'))

    expect(reason(plan)).toContain('postérieure')
  })

  it('refuse un tag resté dans ce clone d’une publication qui n’a pas abouti', async () => {
    const root = await socleRepository()

    await tryGit(root, ['tag', 'v0.2.0'])

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('git tag -d v0.2.0')
  })

  it('renvoie au pull quand le distant publie plus récent que ce clone', async () => {
    const root = await socleRepository()

    const plan = await planRelease(
      root,
      SOCLE,
      'minor',
      tags('v0.1.0', 'v0.2.0'),
    )

    expect(reason(plan)).toContain('git pull')
  })

  it('refuse une note dont l’action requise ne se lit pas', async () => {
    const root = await socleRepository()

    await note(root, '0.2.0', 'peut-être')

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('Action requise')
  })

  it('refuse une action manuelle publiée autrement qu’en majeure', async () => {
    const root = await socleRepository()

    await note(root, '0.2.0', 'manuelle')

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(reason(plan)).toContain('majeure')
  })

  // La panne que `mise-a-jour.md` nomme « discrète » : le numéro est porté, le
  // tag ne l’est pas. Le rang demandé ne peut pas la trancher — c’est la
  // version déjà écrite qu’il reste à publier, et la commande le dit.
  it('nomme la version à taguer quand le manifeste a été bumpé sans l’être', async () => {
    const root = await socleRepository('0.2.0')

    const plan = await planRelease(
      root,
      { ...SOCLE, version: '0.2.0' },
      'minor',
      tags('v0.1.0'),
    )

    expect(reason(plan)).toContain('basalte release 0.2.0')
  })
})

describe('la note qui manque', () => {
  it('ébauche le gabarit et ne publie rien', async () => {
    const root = await socleRepository()

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    expect(plan.kind).toBe('draft')

    if (plan.kind !== 'draft') return

    expect(plan.release.tag).toBe('v0.2.0')

    await writeNote(root, plan.release, plan.template)

    expect(
      await readFile(path.join(root, plan.release.note), 'utf8'),
    ).toContain('## v0.2.0')

    const tagged = await tryGit(root, ['tag', '--list'])

    expect(tagged.kind === 'done' && tagged.stdout.trim()).toBe('')
  })
})

describe('publication', () => {
  async function ready(root: string) {
    await note(root, '0.2.0', 'aucune')

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    if (plan.kind !== 'ready') throw new Error(reason(plan))

    return plan.release
  }

  it('vérifie, porte le numéro, commite, tague et pousse — dans cet ordre', async () => {
    const root = await socleRepository()
    const release = await ready(root)
    const { run, seen } = npm()

    const steps = await applyRelease(root, release, run)

    expect(steps.every((step) => step.ok)).toBe(true)
    expect(seen).toEqual(['run verify', 'version 0.2.0 --no-git-tag-version'])
    expect(steps.map((step) => step.label)).toEqual([
      'verify passé',
      'numéro porté à 0.2.0',
      'commit « release: v0.2.0 »',
      'tag v0.2.0',
      'main et v0.2.0 poussés',
    ])

    const pushed = await tryGit(root, ['ls-remote', '--tags', 'origin'])

    expect(pushed.kind === 'done' && pushed.stdout).toContain('v0.2.0')
  })

  it('n’écrit rien quand verify ne passe pas', async () => {
    const root = await socleRepository()
    const release = await ready(root)
    const { run, seen } = npm('run verify')

    const steps = await applyRelease(root, release, run)

    expect(steps[0]?.ok).toBe(false)
    expect(seen).toEqual(['run verify'])

    const manifest = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    ) as { version: string }

    expect(manifest.version).toBe('0.1.0')
  })

  it('rend le dépôt à son état d’avant quand le push est refusé', async () => {
    const root = await socleRepository()
    const release = await ready(root)

    await tryGit(root, [
      'remote',
      'set-url',
      'origin',
      path.join(root, 'nulle-part'),
    ])

    const head = await tryGit(root, ['rev-parse', 'HEAD'])
    const steps = await applyRelease(root, release, npm().run)

    expect(steps.some((step) => !step.ok)).toBe(true)
    expect(steps.at(-1)?.label).toContain('rien n’est publié')

    const after = await tryGit(root, ['rev-parse', 'HEAD'])

    expect(after.kind === 'done' && after.stdout).toBe(
      head.kind === 'done' ? head.stdout : '',
    )

    const tagged = await tryGit(root, ['tag', '--list'])

    expect(tagged.kind === 'done' && tagged.stdout.trim()).toBe('')

    const manifest = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    ) as { version: string }

    expect(manifest.version).toBe('0.1.0')

    // La note reste, et elle est tout ce qui reste : c'est ce que la
    // commande demandera de nouveau au prochain essai.
    const status = await tryGit(root, [
      'status',
      '--porcelain',
      '--untracked-files=all',
    ])

    expect(status.kind === 'done' && status.stdout.trim()).toBe(
      '?? notes/v0.2.0.md',
    )
  })

  // La note vient d'être écrite : elle n'est pas commitée, et c'est
  // exactement l'état dans lequel la seconde passe trouve le dépôt.
  it('garde la note écrite à la main quand tout est annulé', async () => {
    const root = await socleRepository()

    await note(root, '0.2.0', 'aucune')

    const plan = await planRelease(root, SOCLE, 'minor', tags('v0.1.0'))

    if (plan.kind !== 'ready') throw new Error(reason(plan))

    await tryGit(root, ['remote', 'remove', 'origin'])
    await applyRelease(root, plan.release, npm().run)

    expect(
      await readFile(path.join(root, plan.release.note), 'utf8'),
    ).toContain('**Action requise :** aucune')
  })
})
