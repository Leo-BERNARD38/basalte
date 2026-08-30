import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { CONTENT_DIR } from '../content/page.js'

import {
  acceptDocument,
  DOCUMENT_DIR,
  MAX_DOCUMENT_BYTES,
  readDocuments,
  storeDocument,
  writeDocuments,
} from './documents.js'
import { documentUrl } from './resolve.js'

const roots: string[] = []

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n')

async function depot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'basalte-documents-'))

  roots.push(root)

  await mkdir(path.join(root, CONTENT_DIR), { recursive: true })

  return root
}

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

describe('acceptDocument', () => {
  it('accepte un PDF et le nomme d’après son empreinte', () => {
    const accepted = acceptDocument(PDF, 'Conditions générales.pdf')

    expect(accepted.key).toMatch(/^[0-9a-f]{16}$/)
    expect(accepted.file).toBe(`${accepted.key}.pdf`)
    expect(accepted.entry.name).toBe('Conditions générales.pdf')
    expect(accepted.entry.bytes).toBe(PDF.byteLength)
    expect(documentUrl(accepted.key)).toBe(`/documents/${accepted.key}.pdf`)
  })

  it('donne la même clé au même contenu', () => {
    expect(acceptDocument(PDF, 'a.pdf').key).toBe(
      acceptDocument(Buffer.from(PDF), 'b.pdf').key,
    )
  })

  it('lit le type sur les octets réels, jamais sur l’extension', () => {
    expect(() =>
      acceptDocument(Buffer.from('<svg onload=1>'), 'x.pdf'),
    ).toThrow(/PDF/)
  })

  it('refuse un fichier trop lourd', () => {
    const heavy = Buffer.concat([PDF, Buffer.alloc(MAX_DOCUMENT_BYTES)])

    expect(() => acceptDocument(heavy, 'gros.pdf')).toThrow(/limite/)
  })

  it('ne garde du nom affiché ni chemin ni caractère de contrôle', () => {
    expect(acceptDocument(PDF, '../../etc/cgv.pdf').entry.name).toBe('cgv.pdf')
    expect(acceptDocument(PDF, 'c:\\dossier\\cgv.pdf').entry.name).toBe(
      'cgv.pdf',
    )
    expect(acceptDocument(PDF, 'a\u0000b.pdf').entry.name).toBe('ab.pdf')
  })

  it('refuse un nom vide une fois nettoyé', () => {
    expect(() => acceptDocument(PDF, '///')).toThrow(/nom/)
  })
})

describe('le manifeste des documents', () => {
  it('rend une médiathèque vide quand le fichier n’existe pas', async () => {
    expect(await readDocuments(await depot())).toEqual({})
  })

  it('écrit puis relit une entrée, et stocke le fichier sous son empreinte', async () => {
    const root = await depot()
    const accepted = acceptDocument(PDF, 'cgv.pdf')

    await storeDocument(root, accepted)
    await writeDocuments(root, { [accepted.key]: accepted.entry })

    expect(await readDocuments(root)).toEqual({
      [accepted.key]: accepted.entry,
    })
    expect(
      await readFile(path.join(root, DOCUMENT_DIR, accepted.file)),
    ).toEqual(PDF)
  })
})
