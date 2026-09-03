import { mkdir, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { writeJsonFile } from '../content/write.js'
import { contentWatcher } from './index.js'

// Le serveur de Vite, réduit à ce que le guetteur lui demande.
function fakeServer() {
  const listeners = new Map<string, (file: string) => void>()
  const invalidated: string[] = []
  const sent: string[] = []

  return {
    server: {
      watcher: {
        add: () => undefined,
        on: (event: string, listener: (file: string) => void) => {
          listeners.set(event, listener)
        },
      },
      moduleGraph: {
        onFileChange: (file: string) => {
          invalidated.push(file)
        },
      },
      hot: {
        send: (payload: { readonly type: string }) => {
          sent.push(payload.type)
        },
      },
    },
    emit: (event: string, file: string) => listeners.get(event)?.(file),
    invalidated,
    sent,
  }
}

const ROOT = await mkdtemp(path.join(os.tmpdir(), 'basalte-watch-'))
const GENERATED = path.join(ROOT, '.astro', 'basalte.ts')

await mkdir(path.join(ROOT, 'content'), { recursive: true })

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250))
}

describe('contentWatcher', () => {
  it('régénère puis recharge quand un fichier de contenu change ailleurs que dans le panel', async () => {
    const fake = fakeServer()
    let regenerated = 0

    contentWatcher({
      root: ROOT,
      generated: GENERATED,
      regenerate: async () => {
        regenerated += 1
      },
      warn: () => undefined,
    }).configureServer(fake.server)

    fake.emit('change', path.join(ROOT, 'content', 'index.json'))
    fake.emit('add', path.join(ROOT, 'content', 'about.json'))
    await settled()

    expect(regenerated).toBe(1)
    expect(fake.invalidated).toEqual([GENERATED])
    expect(fake.sent).toEqual(['full-reload'])
  })

  it('régénère sans recharger quand c’est le panel qui vient d’écrire', async () => {
    const fake = fakeServer()
    const file = path.join(ROOT, 'content', 'index.json')
    let regenerated = 0

    contentWatcher({
      root: ROOT,
      generated: GENERATED,
      regenerate: async () => {
        regenerated += 1
      },
      warn: () => undefined,
    }).configureServer(fake.server)

    await writeJsonFile(file, {})
    fake.emit('change', file)
    await settled()

    expect(regenerated).toBe(1)
    expect(fake.invalidated).toEqual([GENERATED])
    expect(fake.sent).toEqual([])
  })

  it('ignore ce qui n’est pas un JSON de content/, et dit quand la relecture échoue', async () => {
    const fake = fakeServer()
    const warned: string[] = []

    contentWatcher({
      root: ROOT,
      generated: GENERATED,
      regenerate: async () => {
        throw new Error('JSON illisible')
      },
      warn: (message) => {
        warned.push(message)
      },
    }).configureServer(fake.server)

    fake.emit('change', path.join(ROOT, 'content', 'index.json.partial'))
    fake.emit('change', path.join(ROOT, 'src', 'blocks', 'x', 'schema.ts'))
    await settled()

    expect(warned).toEqual([])
    expect(fake.invalidated).toEqual([])

    fake.emit('unlink', path.join(ROOT, 'content', 'index.json'))
    await settled()

    expect(warned).toEqual(['Le contenu n’a pas pu être relu : JSON illisible'])
    expect(fake.invalidated).toEqual([])
    expect(fake.sent).toEqual([])
  })
})
