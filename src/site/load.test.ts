import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadSite } from './load.js'

const define = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'define.ts'),
).href

async function project(source: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'basalte-'))
  await writeFile(path.join(root, 'site.config.ts'), source, 'utf8')
  return root
}

describe('loadSite', () => {
  it('lit un site.config.ts sans compilateur', async () => {
    const root = await project(`
      import { defineSite } from ${JSON.stringify(define)}

      export default defineSite({
        name: 'Atelier Duvallon',
        domain: 'atelier-duvallon.fr',
        languages: { fr: { default: true }, en: { draft: true } },
        tokens: { color: { accent: '#c81e5a' } },
      })
    `)

    const site = await loadSite(root)

    expect(site.name).toBe('Atelier Duvallon')
    expect(site.languages.onlineCodes).toEqual(['fr'])
    expect(site.tokens.color.accent).toBe('#c81e5a')
  })

  it('nomme le fichier manquant', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'basalte-'))

    await expect(loadSite(root)).rejects.toThrow(/site\.config\.ts/)
  })

  it('refuse un fichier qui n’exporte pas defineSite', async () => {
    const root = await project('export default { name: "Sans socle" }')

    await expect(loadSite(root)).rejects.toThrow(/defineSite/)
  })
})
