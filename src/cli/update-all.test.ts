import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { updateAll } from './update-all.js'

async function listing(
  content: string,
): Promise<{ cwd: string; file: string }> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'basalte-parc-'))

  await writeFile(path.join(cwd, 'sites.txt'), content, 'utf8')

  return { cwd, file: 'sites.txt' }
}

describe('basalte update-all', () => {
  it('monte chaque site par son propre basalte update, dans l’ordre', async () => {
    const { cwd, file } = await listing(
      'atelier\n# commentaire\nboulangerie # note\n',
    )
    const seen: string[] = []

    const result = await updateAll([file], cwd, (root, args) => {
      seen.push(`${path.basename(root)} ${args.join(' ')}`)

      return Promise.resolve({ ok: true, code: 0 })
    })

    expect(result.code).toBe(0)
    expect(seen).toEqual([
      'atelier exec -- basalte update',
      'boulangerie exec -- basalte update',
    ])
    expect(result.stdout).toContain('atelier')
    expect(result.stdout).toContain('boulangerie')
  })

  it('s’arrête au premier site en échec, et le nomme', async () => {
    const { cwd, file } = await listing('un\ndeux\ntrois\n')
    const seen: string[] = []

    const result = await updateAll([file], cwd, (root) => {
      seen.push(path.basename(root))

      return Promise.resolve(
        path.basename(root) === 'deux'
          ? { ok: false, code: 1 }
          : { ok: true, code: 0 },
      )
    })

    expect(result.code).not.toBe(0)
    expect(seen).toEqual(['un', 'deux'])
    expect(result.stderr + result.stdout).toContain('deux — arrêt ici')
  })

  it('refuse une liste absente ou vide', async () => {
    const { cwd, file } = await listing('# rien\n')

    expect((await updateAll([], cwd)).code).not.toBe(0)
    expect((await updateAll([file], cwd)).code).not.toBe(0)
  })
})
