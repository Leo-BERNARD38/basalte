import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { writeJsonFile, writtenByPanel } from './write.js'

describe('writeJsonFile', () => {
  it('écrit le JSON indenté, et signe le fichier comme écrit par le panel', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'basalte-write-'))
    const file = path.join(dir, 'page.json')

    await writeJsonFile(file, { a: 1 })

    expect(await readFile(file, 'utf8')).toBe('{\n  "a": 1\n}\n')
    expect(writtenByPanel(file)).toBe(true)
  })

  it('ne signe qu’une fois, et plus du tout passé le délai', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'basalte-write-'))
    const file = path.join(dir, 'page.json')

    await writeJsonFile(file, {})

    expect(writtenByPanel(file)).toBe(true)
    expect(writtenByPanel(file)).toBe(false)

    await writeJsonFile(file, {})

    expect(writtenByPanel(file, Date.now() + 10_000)).toBe(false)
  })

  it('ne connaît pas un fichier écrit par un autre', () => {
    expect(writtenByPanel('/nulle/part.json')).toBe(false)
  })
})
