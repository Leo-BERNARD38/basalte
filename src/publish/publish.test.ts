import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { EMAIL } from '../server/auth.fixture.js'
import {
  bench,
  buildsBadly,
  buildsFine,
  type Bench,
} from '../server/panel.fixture.js'
import type { Build } from './publish.js'
import { currentRelease, listReleases, RELEASES } from './release.js'

const BY = { email: EMAIL }

/** Un build qu’on retient, pour observer la file pendant qu’il tourne. */
function held() {
  const outputs: string[] = []
  const gates: (() => void)[] = []

  const build: Build = async (_root, outDir) => {
    outputs.push(outDir)

    await new Promise<void>((resolve) => gates.push(resolve))
    await mkdir(outDir, { recursive: true })
    await writeFile(path.join(outDir, 'index.html'), 'x', 'utf8')

    return { kind: 'built' }
  }

  // Attend qu’un build soit vraiment en attente avant de le relâcher : le
  // relâcher trop tôt ouvrirait une porte déjà franchie.
  const go = async () => {
    while (gates.length === 0) {
      await new Promise((resolve) => setImmediate(resolve))
    }

    gates.shift()?.()
  }

  return { build, outputs, go }
}

/** Un build qui réussit jusqu’à ce que le test décide qu’il échoue. */
function switchable() {
  let refuse: string | undefined

  const build: Build = async (root, outDir) =>
    refuse === undefined
      ? buildsFine(root, outDir)
      : { kind: 'failed', detail: refuse }

  return {
    build,
    breakIt: (detail: string) => {
      refuse = detail
    },
  }
}

async function publish(site: Bench): Promise<void> {
  site.publisher.request(BY)
  await site.publisher.settled()
}

describe('mise en ligne réussie', () => {
  it('construit une version et fait pointer le lien dessus', async () => {
    const site = await bench()

    await publish(site)

    const online = await currentRelease(site.serving)

    expect(online).toBeDefined()
    expect(await listReleases(site.serving)).toEqual([online])
    expect(
      await readFile(path.join(site.serving, 'current', 'index.html'), 'utf8'),
    ).toBe('<p>banc</p>')

    await site.close()
  })

  it('dit au client que son site est sorti, et n’alerte personne', async () => {
    const site = await bench()

    await publish(site)

    const state = site.publisher.state()

    expect(state.running).toBe(false)
    expect(state.last?.outcome).toBe('published')
    expect(state.last?.message).toBe('Ton site est en ligne.')
    expect(site.alerts).toHaveLength(0)

    await site.close()
  })
})

describe('mise en ligne en échec', () => {
  it('laisse le site en ligne intact et ne garde aucun dossier inachevé', async () => {
    const builder = switchable()
    const site = await bench({ build: builder.build })

    await publish(site)

    const online = await currentRelease(site.serving)

    builder.breakIt('Astro a rendu 1')
    site.harness.travel(1000)

    await publish(site)

    expect(await currentRelease(site.serving)).toBe(online)
    expect(await listReleases(site.serving)).toEqual([online])
    expect(
      (await readdir(path.join(site.serving, RELEASES))).filter((name) =>
        name.endsWith('.partial'),
      ),
    ).toEqual([])

    await site.close()
  })

  it('ne met rien en ligne quand le tout premier build échoue', async () => {
    const site = await bench({ build: buildsBadly() })

    await publish(site)

    expect(await currentRelease(site.serving)).toBeUndefined()
    expect(
      await readdir(path.join(site.serving, RELEASES)).catch(() => []),
    ).toEqual([])

    await site.close()
  })

  it('dit une phrase au client et envoie la trace au mainteneur', async () => {
    const site = await bench({
      build: buildsBadly('TypeError: Cannot read properties of undefined'),
    })

    await publish(site)

    const message = site.publisher.state().last?.message ?? ''

    expect(message).toContain('n’a pas changé')
    expect(message).not.toContain('TypeError')

    expect(site.alerts).toHaveLength(1)
    expect(site.alerts[0]?.subject).toContain('Mise en ligne en échec')
    expect(site.alerts[0]?.text).toContain('TypeError')

    await site.close()
  })
})

describe('la file n’a qu’une place', () => {
  it('fait attendre la deuxième demande, et la troisième remplace la deuxième', async () => {
    const holder = held()
    const site = await bench({ build: holder.build })

    site.publisher.request(BY)

    expect(site.publisher.state().running).toBe(true)
    expect(site.publisher.state().queued).toBe(false)

    site.publisher.request(BY)
    site.publisher.request(BY)

    expect(site.publisher.state().queued).toBe(true)

    await holder.go()
    await holder.go()
    await site.publisher.settled()

    // Trois demandes, deux builds : les deux dernières n’en ont fait qu’un.
    expect(holder.outputs).toHaveLength(2)
    expect(site.publisher.state().queued).toBe(false)
    expect(site.publisher.state().running).toBe(false)

    await site.close()
  })

  it('garde les cinq dernières versions et pas davantage', async () => {
    const site = await bench()

    for (let turn = 0; turn < 7; turn += 1) {
      site.harness.travel(1000)
      await publish(site)
    }

    expect(await listReleases(site.serving)).toHaveLength(5)

    await site.close()
  })
})

describe('sans dépôt distant', () => {
  it('met en ligne quand même, sans se plaindre au client', async () => {
    const site = await bench()

    await publish(site)

    expect(site.publisher.state().last?.message).toBe('Ton site est en ligne.')
    expect(site.alerts).toHaveLength(0)

    await site.close()
  })
})
