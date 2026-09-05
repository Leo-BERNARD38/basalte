// La garde de renvoi, éprouvée sur des dépôts jetables : c’est le seul moyen
// de faire manquer un fichier sans casser celui-ci.
//
// Le cas qui compte est le dernier — un chemin de dépôt client cité par le
// socle. Sans lui, la règle serait rouge sur ce dépôt le jour de son écriture,
// et on l’aurait desserrée au lieu de la comprendre.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { deadReferences } from './references.js'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

/** Un dépôt jetable, écrit fichier par fichier. */
async function repository(
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'basalte-renvois-'))

  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(root, ...name.split('/'))

    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, contents, 'utf8')
  }

  return root
}

describe('deadReferences', () => {
  it('ne reproche aucun renvoi au socle', async () => {
    expect(await deadReferences(ROOT)).toEqual([])
  })

  it('nomme le fichier et la ligne d’un document qui n’existe pas', async () => {
    const root = await repository({
      'docs/panel.md': 'Le reste est dans `roadmap.md`.\n',
    })

    const found = await deadReferences(root)

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      file: 'docs/panel.md',
      line: 1,
      rule: 'docs/reference',
      severity: 'error',
    })
    expect(found[0]?.message).toContain('roadmap.md')
  })

  it('accepte un nom seul quand le document est dans docs/', async () => {
    const root = await repository({
      'docs/panel.md': 'Voir `securite.md`.\n',
      'docs/securite.md': '# Sécurité\n',
    })

    expect(await deadReferences(root)).toEqual([])
  })

  it('lit le message d’une commande comme un renvoi', async () => {
    const root = await repository({
      'src/cli/run.ts': "console.log('Voir docs/absent.md pour la suite.')\n",
    })

    const found = await deadReferences(root)

    expect(found).toHaveLength(1)
    expect(found[0]?.file).toBe('src/cli/run.ts')
  })

  it('laisse un nom de fichier que du code assemble', async () => {
    const root = await repository({
      'src/client/skills.ts':
        "export const file = path.posix.join(dir, name, 'SKILL.md')\n",
    })

    expect(await deadReferences(root)).toEqual([])
  })

  it('ignore un test, qui cite des noms inventés exprès', async () => {
    const root = await repository({
      'src/release/release.test.ts': "expect(read('brouillon.md')).toBe('')\n",
    })

    expect(await deadReferences(root)).toEqual([])
  })

  it('laisse passer une note de version, qui n’existe qu’après sa publication', async () => {
    const root = await repository({
      'docs/mise-a-jour.md': 'La note vit dans `notes/vX.Y.Z.md`.\n',
      'src/client/notes.ts': '// Par exemple `notes/v1.5.0.md`.\n',
    })

    expect(await deadReferences(root)).toEqual([])
  })

  it('laisse passer un chemin de dépôt client, que le socle écrit sans le porter', async () => {
    const root = await repository({
      'docs/depot-client.md':
        'Le contexte va dans `docs/CONTEXT.md`, et l’inventaire dans `.claude/basalte.md`.\n',
    })

    expect(await deadReferences(root)).toEqual([])
  })

  it('refuse un chemin qui ressemble à un fichier généré sans en être un', async () => {
    const root = await repository({
      'docs/depot-client.md': 'Et le relevé dans `.claude/contenu.md`.\n',
    })

    const found = await deadReferences(root)

    expect(found).toHaveLength(1)
    expect(found[0]?.message).toContain('.claude/contenu.md')
  })
})
