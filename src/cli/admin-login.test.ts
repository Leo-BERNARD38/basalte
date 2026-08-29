import { describe, expect, it } from 'vitest'

import { findAccount } from '../server/account.js'
import { EMAIL, harness, HERE } from '../server/auth.fixture.js'
import { RESCUE_PATH } from '../server/handlers.js'
import { useRescue } from '../server/login.js'
import { adminLogin, issueRescue } from './admin-login.js'

const DOMAIN = 'exemple.fr'

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

describe('issueRescue', () => {
  it('produit un lien qui ouvre vraiment une session', async () => {
    const bench = await harness()

    const result = await issueRescue(bench.server, DOMAIN, EMAIL, false)

    expect(result.code).toBe(0)
    expect(result.stdout).toContain(RESCUE_PATH)
    expect(result.stdout).toContain('10 minutes')

    const token = new URL(link(result.stdout)).searchParams.get('token') ?? ''

    expect(useRescue(bench.server, token, HERE).kind).toBe('signed-in')

    bench.close()
  })

  it('crée le compte et affiche son mot de passe une fois', async () => {
    const bench = await harness({ account: false })

    const result = await issueRescue(bench.server, DOMAIN, EMAIL, true)

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
      issueRescue(bench.server, DOMAIN, EMAIL, true),
    ).rejects.toThrow('existe déjà')

    bench.close()
  })

  it('refuse un lien pour un compte qui n’existe pas', async () => {
    const bench = await harness({ account: false })

    await expect(
      issueRescue(bench.server, DOMAIN, EMAIL, false),
    ).rejects.toThrow('Aucun compte')

    bench.close()
  })
})
