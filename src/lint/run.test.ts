// Le contrôle joué sur ce dépôt, qui est lui-même un site : ses blocs de
// référence sont ce que les règles décrivent, et les voir passer est la seule
// preuve qu’elles ne réclament pas l’impossible.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { lintProject } from './run.js'
import { catchAll, inlineScripts } from './structure.js'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

describe('lintProject', () => {
  it('ne reproche rien aux blocs et au chrome du socle', async () => {
    expect(await lintProject(ROOT)).toEqual([])
  })

  it('rend un rapport vide sur un dépôt sans le moindre bloc', async () => {
    expect(await lintProject(path.join(ROOT, 'notes'))).toEqual([])
  })
})

describe('catchAll', () => {
  it('ne trouve aucun fourre-tout dans le socle', async () => {
    expect(await catchAll(ROOT)).toEqual([])
  })
})

describe('inlineScripts', () => {
  it('avertit sans refuser', () => {
    const found = inlineScripts('B.astro', '<script>\n  const a = 1\n</script>')

    expect(found).toHaveLength(1)
    expect(found[0]?.severity).toBe('warning')
  })

  it('se tait sur un bloc sans script', () => {
    expect(inlineScripts('B.astro', '<p>bonjour</p>')).toEqual([])
  })
})
