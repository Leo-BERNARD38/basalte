import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  currentRelease,
  discardStalePartials,
  KEEP,
  listReleases,
  openRelease,
  PARTIAL,
  pruneReleases,
  publishRelease,
  RELEASES,
  siteRoot,
  stampOf,
  switchTo,
} from './release.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))

const created: string[] = []

afterEach(async () => {
  for (const directory of created.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

async function serving(): Promise<string> {
  await mkdir(WORK, { recursive: true })

  const directory = await mkdtemp(path.join(WORK, 'srv-'))

  created.push(directory)

  return directory
}

/** Pose une version aboutie, avec un fichier reconnaissable dedans. */
async function release(root: string, name: string, body: string) {
  const directory = path.join(root, RELEASES, name)

  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, 'index.html'), body, 'utf8')
}

describe('siteRoot', () => {
  it('suit la variable d’environnement quand elle est posée', () => {
    expect(siteRoot('/depot', { BASALTE_SITE_ROOT: '/srv/site' })).toBe(
      path.resolve('/srv/site'),
    )
  })

  it('retombe dans le dépôt, où rien ne le partage', () => {
    expect(siteRoot('/depot', {})).toBe(path.join('/depot', '.basalte', 'site'))
    expect(siteRoot('/depot', { BASALTE_SITE_ROOT: '  ' })).toBe(
      path.join('/depot', '.basalte', 'site'),
    )
  })
})

describe('stampOf', () => {
  it('donne un horodatage triable et acceptable comme nom de dossier', () => {
    const stamp = stampOf(Date.UTC(2026, 7, 29, 15, 21, 40))

    expect(stamp).toBe('2026-08-29T15-21-40')
    expect(stamp).not.toContain(':')
  })
})

describe('openRelease', () => {
  it('réserve un dossier inachevé, à côté de celui qui portera le nom', async () => {
    const root = await serving()
    const opened = await openRelease(root, '2026-08-29T15-21-40')

    expect(path.basename(opened.partial)).toBe(`2026-08-29T15-21-40${PARTIAL}`)
    expect(path.basename(opened.final)).toBe('2026-08-29T15-21-40')
  })

  it('ne réemploie pas un nom déjà pris dans la même seconde', async () => {
    const root = await serving()

    await release(root, '2026-08-29T15-21-40', 'première')

    const opened = await openRelease(root, '2026-08-29T15-21-40')

    expect(opened.name).toBe('2026-08-29T15-21-40-2')
  })
})

describe('publishRelease', () => {
  it('rend la version visible, et le lien la désigne', async () => {
    const root = await serving()
    const opened = await openRelease(root, stampOf(Date.now()))

    await mkdir(opened.partial, { recursive: true })
    await writeFile(path.join(opened.partial, 'index.html'), 'neuf', 'utf8')

    await publishRelease(root, opened)

    expect(await currentRelease(root)).toBe(opened.name)
    expect(
      await readFile(path.join(root, 'current', 'index.html'), 'utf8'),
    ).toBe('neuf')
  })

  it('bascule d’une version à l’autre sans toucher au contenu de l’ancienne', async () => {
    const root = await serving()

    await release(root, '2026-08-29T10-00-00', 'ancienne')
    await release(root, '2026-08-29T11-00-00', 'nouvelle')

    await switchTo(root, '2026-08-29T10-00-00')
    await switchTo(root, '2026-08-29T11-00-00')

    expect(await currentRelease(root)).toBe('2026-08-29T11-00-00')

    // Remplacer le lien ne doit jamais suivre l’ancien pour effacer ce qu’il
    // désignait : la version précédente est ce qui rend le retour instantané.
    expect(
      await readFile(
        path.join(root, RELEASES, '2026-08-29T10-00-00', 'index.html'),
        'utf8',
      ),
    ).toBe('ancienne')
  })

  it('ne laisse aucun lien intermédiaire derrière lui', async () => {
    const root = await serving()

    await release(root, '2026-08-29T10-00-00', 'ancienne')
    await switchTo(root, '2026-08-29T10-00-00')

    expect((await readdir(root)).sort()).toEqual(['current', RELEASES])
  })
})

describe('currentRelease', () => {
  it('ne connaît rien tant qu’aucune version n’est en ligne', async () => {
    expect(await currentRelease(await serving())).toBeUndefined()
  })
})

describe('listReleases', () => {
  it('ignore un dossier inachevé et rend la plus récente d’abord', async () => {
    const root = await serving()

    await release(root, '2026-08-29T10-00-00', 'a')
    await release(root, '2026-08-29T12-00-00', 'b')
    await release(root, `2026-08-29T13-00-00${PARTIAL}`, 'en cours')

    expect(await listReleases(root)).toEqual([
      '2026-08-29T12-00-00',
      '2026-08-29T10-00-00',
    ])
  })
})

describe('pruneReleases', () => {
  it('garde les cinq dernières et supprime le reste', async () => {
    const root = await serving()

    for (let hour = 0; hour < 8; hour += 1) {
      await release(root, `2026-08-29T0${hour}-00-00`, String(hour))
    }

    const removed = await pruneReleases(root)

    expect(removed).toHaveLength(3)
    expect(await listReleases(root)).toHaveLength(KEEP)
  })

  it('ne supprime jamais la version en ligne', async () => {
    const root = await serving()

    for (let hour = 0; hour < 8; hour += 1) {
      await release(root, `2026-08-29T0${hour}-00-00`, String(hour))
    }

    await switchTo(root, '2026-08-29T00-00-00')
    await pruneReleases(root)

    expect(await listReleases(root)).toContain('2026-08-29T00-00-00')
    expect(await currentRelease(root)).toBe('2026-08-29T00-00-00')
  })
})

describe('discardStalePartials', () => {
  it('efface le dossier d’un build interrompu, et lui seul', async () => {
    const root = await serving()

    await release(root, '2026-08-29T10-00-00', 'aboutie')
    await release(root, `2026-08-29T13-00-00${PARTIAL}`, 'tuée en route')

    const swept = await discardStalePartials(root)

    expect(swept).toEqual([`2026-08-29T13-00-00${PARTIAL}`])
    expect(await readdir(path.join(root, RELEASES))).toEqual([
      '2026-08-29T10-00-00',
    ])
  })

  it('ne dit rien quand il n’y a rien à balayer', async () => {
    const root = await serving()

    await release(root, '2026-08-29T10-00-00', 'aboutie')

    expect(await discardStalePartials(root)).toEqual([])
    expect(await listReleases(root)).toHaveLength(1)
  })
})
