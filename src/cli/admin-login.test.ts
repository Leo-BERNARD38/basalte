import { describe, expect, it } from 'vitest'

import { findAccount } from '../server/account.js'
import { EMAIL, harness, HERE } from '../server/auth.fixture.js'
import { RESCUE_PATH } from '../server/handlers.js'
import { useRescue } from '../server/login.js'
import { adminLogin, issueRescue, rescueOrigin } from './admin-login.js'

const DOMAIN = 'exemple.fr'
const ORIGIN = `https://${DOMAIN}`

function link(stdout: string): string {
  return stdout.match(/https:\/\/\S+/)?.[0] ?? ''
}

describe('adminLogin', () => {
  it('nomme l’option qui manque', async () => {
    const result = await adminLogin([], process.cwd())

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('--user')
  })
})

describe('rescueOrigin', () => {
  it('prend le domaine du site quand rien n’est demandé', () => {
    expect(rescueOrigin(undefined, DOMAIN)).toBe(ORIGIN)
  })

  it('ouvre le lien là où le serveur répond vraiment', () => {
    expect(rescueOrigin('http://localhost:4321', DOMAIN)).toBe(
      'http://localhost:4321',
    )
  })

  it('laisse tomber la barre finale, qui doublerait celle du chemin', () => {
    expect(rescueOrigin('http://localhost:4321/', DOMAIN)).toBe(
      'http://localhost:4321',
    )
  })

  it('refuse ce qui n’est pas une adresse', () => {
    expect(rescueOrigin('localhost:4321', DOMAIN)).toBeUndefined()
    expect(rescueOrigin('http://localhost:4321/admin', DOMAIN)).toBeUndefined()
  })
})

describe('issueRescue', () => {
  it('produit un lien qui ouvre vraiment une session', async () => {
    const bench = await harness()

    const result = await issueRescue(bench.server, ORIGIN, EMAIL, false)

    expect(result.code).toBe(0)
    expect(result.stdout).toContain(`${ORIGIN}${RESCUE_PATH}`)
    expect(result.stdout).toContain('10 minutes')

    const token = new URL(link(result.stdout)).searchParams.get('token') ?? ''

    expect(useRescue(bench.server, token, HERE).kind).toBe('signed-in')

    bench.close()
  })

  it('ouvre le lien sur l’adresse locale quand elle est donnée', async () => {
    const bench = await harness()

    const result = await issueRescue(
      bench.server,
      'http://localhost:4321',
      EMAIL,
      false,
    )

    expect(result.stdout).toContain('http://localhost:4321/admin/rescue?token=')

    bench.close()
  })

  it('crée le compte et affiche son mot de passe une fois', async () => {
    const bench = await harness({ account: false })

    const result = await issueRescue(bench.server, ORIGIN, EMAIL, true)

    expect(result.stdout).toContain('compte créé')
    expect(findAccount(bench.server.database, EMAIL)).toBeDefined()

    const password = result.stdout.match(/Mot de passe : (\S+)/)?.[1] ?? ''

    expect(password).toMatch(/^[a-zA-Z2-9]{5}(-[a-zA-Z2-9]{5}){3}$/)
    expect(bench.email.sent).toHaveLength(0)

    bench.close()
  })

  it('refuse de créer deux fois le même compte', async () => {
    const bench = await harness()

    await expect(
      issueRescue(bench.server, ORIGIN, EMAIL, true),
    ).rejects.toThrow('existe déjà')

    bench.close()
  })

  it('refuse un lien pour un compte qui n’existe pas', async () => {
    const bench = await harness({ account: false })

    await expect(
      issueRescue(bench.server, ORIGIN, EMAIL, false),
    ).rejects.toThrow('Aucun compte')

    bench.close()
  })
})
