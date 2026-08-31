import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { resolveLanguages } from '../site/languages.js'
import { readBusinessFile, validateBusiness } from './business.js'
import { CONTENT_FORMAT } from './page.js'
import { errorsOf } from './project.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const languages = resolveLanguages({ fr: { default: true } })

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
  }
})

async function site(): Promise<string> {
  const root = await mkdtemp(path.join(WORK, 'fiche-'))

  roots.push(root)

  return root
}

function validate(source: unknown) {
  return validateBusiness({ source, languages, media: {}, documents: {} })
}

describe('readBusinessFile', () => {
  it('rend une enveloppe du format courant quand le fichier n’existe pas', async () => {
    expect(await readBusinessFile(await site())).toEqual({
      $format: CONTENT_FORMAT,
    })
  })
})

describe('validateBusiness', () => {
  it('remplit les champs absents plutôt que de rendre un objet vide', () => {
    const { business, issues } = validate({ $format: CONTENT_FORMAT })

    expect(errorsOf(issues)).toEqual([])
    expect(business.legalName).toBe('')
    expect(business.address.city).toBe('')
    expect(business.hours).toEqual([])
  })

  it('garde ce que le fichier porte', () => {
    const { business } = validate({
      $format: CONTENT_FORMAT,
      facts: {
        legalName: 'Atelier Duvallon SARL',
        address: { city: 'Grenoble' },
        hours: [{ day: 'Monday', opens: '09:00', closes: '18:00' }],
      },
    })

    expect(business.legalName).toBe('Atelier Duvallon SARL')
    expect(business.address.city).toBe('Grenoble')
    expect(business.hours).toHaveLength(1)
  })

  it('refuse un jour qui n’est pas de la liste', () => {
    const { issues } = validate({
      $format: CONTENT_FORMAT,
      facts: { hours: [{ day: 'Lundi', opens: '09:00', closes: '18:00' }] },
    })

    expect(errorsOf(issues)).not.toEqual([])
  })

  it('réclame une migration sur un format plus ancien', () => {
    const { issues } = validate({ $format: CONTENT_FORMAT - 1 })

    expect(errorsOf(issues)[0]?.message).toContain('basalte migrate')
  })

  it('reste ouvrable quand le fichier n’a pas la bonne forme', () => {
    const { business, issues } = validate({ $format: 'un' })

    expect(errorsOf(issues)).not.toEqual([])
    expect(business.legalName).toBe('')
  })
})
