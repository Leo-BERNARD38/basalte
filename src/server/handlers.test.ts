import { describe, expect, it } from 'vitest'

import {
  EMAIL,
  harness,
  PASSWORD,
  START,
  type Harness,
} from './auth.fixture.js'
import { COOKIES } from './cookies.js'
import { LOCK_AFTER } from './account.js'
import { AUTH_PREFIX, handleAuth, PANEL_PATH, RESCUE_PATH } from './handlers.js'
import { createRescue } from './login.js'
import { readSession } from './session.js'

const SITE = 'https://exemple.fr'
const AGENT = 'Firefox/142.0'
const ADDRESS = '203.0.113.7'
const NEXT = 'onyx-brume-quille-safran'

/** Un navigateur : il garde ses cookies d’une requête à l’autre. */
function browser(bench: Harness) {
  const jar = new Map<string, string>()

  function headers(extra: Record<string, string>): Record<string, string> {
    const cookie = [...jar]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')

    return {
      'user-agent': AGENT,
      'x-forwarded-for': ADDRESS,
      ...(cookie === '' ? {} : { cookie }),
      ...extra,
    }
  }

  function absorb(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair = '', ...attributes] = raw.split(';')
      const separator = pair.indexOf('=')
      const name = pair.slice(0, separator).trim()

      if (attributes.some((attribute) => /max-age=0\b/i.test(attribute))) {
        jar.delete(name)
      } else {
        jar.set(name, pair.slice(separator + 1).trim())
      }
    }
  }

  return {
    jar,

    async post(
      path: string,
      body: unknown,
      extra: Record<string, string> = {},
    ) {
      const response = await handleAuth(
        bench.server,
        new Request(`${SITE}${path}`, {
          method: 'POST',
          headers: headers({
            'content-type': 'application/json',
            origin: SITE,
            ...extra,
          }),
          body: JSON.stringify(body),
        }),
      )

      if (response === undefined) throw new Error(`Route absente : ${path}`)

      absorb(response)

      return response
    },

    async get(path: string) {
      const response = await handleAuth(
        bench.server,
        new Request(`${SITE}${path}`, { headers: headers({}) }),
      )

      if (response === undefined) throw new Error(`Route absente : ${path}`)

      absorb(response)

      return response
    },
  }
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

describe('handleAuth — le flux entier', () => {
  it('conduit du mot de passe à la session, puis à la déconnexion', async () => {
    const bench = await harness()
    const client = browser(bench)

    const first = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    expect(first.status).toBe(200)
    expect((await body(first))['step']).toBe('code')
    expect(client.jar.has(COOKIES.attempt)).toBe(true)

    const second = await client.post(`${AUTH_PREFIX}code`, {
      code: bench.code(),
      remember: false,
    })

    expect(second.status).toBe(200)
    expect((await body(second))['step']).toBe('panel')
    expect(client.jar.has(COOKIES.session)).toBe(true)
    expect(client.jar.has(COOKIES.attempt)).toBe(false)

    const session = await client.get(`${AUTH_PREFIX}session`)

    expect(session.status).toBe(200)
    expect((await body(session))['email']).toBe(EMAIL)

    const out = await client.post(`${AUTH_PREFIX}sign-out`, {})

    expect(out.status).toBe(200)
    expect(client.jar.has(COOKIES.session)).toBe(false)
    expect((await client.get(`${AUTH_PREFIX}session`)).status).toBe(401)

    bench.close()
  })

  it('pose des cookies inaccessibles au script et cantonnés au site', async () => {
    const bench = await harness()
    const client = browser(bench)

    const response = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    const cookie = response.headers.getSetCookie()[0] ?? ''

    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')

    bench.close()
  })

  it('retient l’appareil, puis se connecte sans code', async () => {
    const bench = await harness()
    const client = browser(bench)

    await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    await client.post(`${AUTH_PREFIX}code`, {
      code: bench.code(),
      remember: true,
    })

    expect(client.jar.has(COOKIES.device)).toBe(true)

    await client.post(`${AUTH_PREFIX}sign-out`, {})

    const again = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    expect((await body(again))['step']).toBe('panel')

    bench.close()
  })
})

describe('handleAuth — refus', () => {
  it('laisse passer ce qui ne lui appartient pas', async () => {
    const bench = await harness()

    expect(
      await handleAuth(bench.server, new Request(`${SITE}/contact`)),
    ).toBeUndefined()

    bench.close()
  })

  it('refuse une requête sans en-tête Origin', async () => {
    const bench = await harness()

    const response = await handleAuth(
      bench.server,
      new Request(`${SITE}${AUTH_PREFIX}sign-in`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    )

    expect(response?.status).toBe(403)

    bench.close()
  })

  it('refuse une requête venue d’un autre site', async () => {
    const bench = await harness()
    const client = browser(bench)

    const response = await client.post(
      `${AUTH_PREFIX}sign-in`,
      { email: EMAIL, password: PASSWORD },
      { origin: 'https://mechant.example' },
    )

    expect(response.status).toBe(403)

    bench.close()
  })

  it('refuse un corps qui n’est pas annoncé en JSON', async () => {
    const bench = await harness()
    const client = browser(bench)

    const response = await client.post(
      `${AUTH_PREFIX}sign-in`,
      { email: EMAIL, password: PASSWORD },
      { 'content-type': 'application/x-www-form-urlencoded' },
    )

    expect(response.status).toBe(415)

    bench.close()
  })

  it('refuse une méthode qui n’est pas la bonne', async () => {
    const bench = await harness()
    const client = browser(bench)

    expect((await client.get(`${AUTH_PREFIX}sign-in`)).status).toBe(405)

    bench.close()
  })

  it('refuse un formulaire incomplet', async () => {
    const bench = await harness()
    const client = browser(bench)

    expect(
      (await client.post(`${AUTH_PREFIX}sign-in`, { email: EMAIL })).status,
    ).toBe(400)

    bench.close()
  })

  it('nomme une adresse inconnue sous le préfixe', async () => {
    const bench = await harness()
    const client = browser(bench)

    expect((await client.post(`${AUTH_PREFIX}inventé`, {})).status).toBe(404)

    bench.close()
  })

  it('répond 401 sur un mot de passe faux, sans dire lequel', async () => {
    const bench = await harness()
    const client = browser(bench)

    const response = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: 'pas-le-bon-mot-de-passe',
    })

    expect(response.status).toBe(401)
    expect((await body(response))['message']).toBe(
      'Adresse ou mot de passe incorrect.',
    )
    expect(client.jar.has(COOKIES.attempt)).toBe(false)

    bench.close()
  })

  it('répond 429 quand le compte est bloqué', async () => {
    const bench = await harness()
    const client = browser(bench)

    for (let attempt = 0; attempt <= LOCK_AFTER; attempt += 1) {
      await client.post(`${AUTH_PREFIX}sign-in`, {
        email: EMAIL,
        password: 'pas-le-bon-mot-de-passe',
      })
    }

    const response = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    expect(response.status).toBe(429)
    expect((await body(response))['retryAt']).toBeGreaterThan(START)

    bench.close()
  })

  it('refuse un code sans tentative en cours', async () => {
    const bench = await harness()
    const client = browser(bench)

    expect(
      (await client.post(`${AUTH_PREFIX}code`, { code: '123456' })).status,
    ).toBe(401)

    bench.close()
  })

  it('refuse les actions du compte à un visiteur non connecté', async () => {
    const bench = await harness()
    const client = browser(bench)

    for (const path of ['password', 'devices/forget']) {
      const response = await client.post(`${AUTH_PREFIX}${path}`, {
        current: PASSWORD,
        next: NEXT,
      })

      expect(response.status).toBe(401)
    }

    bench.close()
  })
})

describe('handleAuth — le compte', () => {
  async function signedIn() {
    const bench = await harness()
    const client = browser(bench)

    await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    await client.post(`${AUTH_PREFIX}code`, {
      code: bench.code(),
      remember: true,
    })

    return { bench, client }
  }

  it('change le mot de passe et refuse ensuite l’ancien', async () => {
    const { bench, client } = await signedIn()

    expect(
      (
        await client.post(`${AUTH_PREFIX}password`, {
          current: PASSWORD,
          next: NEXT,
        })
      ).status,
    ).toBe(200)

    await client.post(`${AUTH_PREFIX}sign-out`, {})

    const refused = await client.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })

    expect(refused.status).toBe(401)

    bench.close()
  })

  it('coupe les autres sessions, et garde celle qui a demandé', async () => {
    const { bench, client } = await signedIn()
    const ailleurs = browser(bench)

    await ailleurs.post(`${AUTH_PREFIX}sign-in`, {
      email: EMAIL,
      password: PASSWORD,
    })
    await ailleurs.post(`${AUTH_PREFIX}code`, { code: bench.code() })

    const response = await client.post(`${AUTH_PREFIX}password`, {
      current: PASSWORD,
      next: NEXT,
    })

    expect((await body(response))['closed']).toBe(1)
    expect((await client.get(`${AUTH_PREFIX}session`)).status).toBe(200)
    expect((await ailleurs.get(`${AUTH_PREFIX}session`)).status).toBe(401)

    bench.close()
  })

  it('explique pourquoi un nouveau mot de passe est refusé', async () => {
    const { bench, client } = await signedIn()

    const response = await client.post(`${AUTH_PREFIX}password`, {
      current: PASSWORD,
      next: 'motdepasse123',
    })

    expect(response.status).toBe(400)
    expect((await body(response))['message']).toContain('plus utilisés')

    bench.close()
  })

  it('montre les appareils et le journal', async () => {
    const { bench, client } = await signedIn()

    const described = await body(await client.get(`${AUTH_PREFIX}session`))
    const devices = described['devices'] as { agent: string }[]
    const journal = described['journal'] as { label: string }[]

    expect(devices).toHaveLength(1)
    expect(devices[0]?.agent).toBe(AGENT)
    expect(journal.map((entry) => entry.label)).toContain(
      'nouvel appareil reconnu',
    )

    bench.close()
  })

  it('oublie les appareils, et coupe la session au passage', async () => {
    const { bench, client } = await signedIn()

    const response = await client.post(`${AUTH_PREFIX}devices/forget`, {})

    expect((await body(response))['forgotten']).toBe(1)
    expect(client.jar.has(COOKIES.device)).toBe(false)
    expect(client.jar.has(COOKIES.session)).toBe(false)
    expect((await client.get(`${AUTH_PREFIX}session`)).status).toBe(401)

    bench.close()
  })
})

describe('handleAuth — lien de secours', () => {
  it('ouvre la session et renvoie vers le panel', async () => {
    const bench = await harness()
    const client = browser(bench)
    const { token } = createRescue(bench.server, EMAIL)

    const response = await client.get(`${RESCUE_PATH}?token=${token}`)

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(PANEL_PATH)

    const session = client.jar.get(COOKIES.session) ?? ''

    expect(
      readSession(bench.server.database, decodeURIComponent(session), START),
    ).toBeDefined()

    bench.close()
  })

  it('refuse un jeton absent ou déjà servi', async () => {
    const bench = await harness()
    const client = browser(bench)
    const { token } = createRescue(bench.server, EMAIL)

    expect((await client.get(RESCUE_PATH)).status).toBe(401)

    await client.get(`${RESCUE_PATH}?token=${token}`)

    expect((await client.get(`${RESCUE_PATH}?token=${token}`)).status).toBe(401)

    bench.close()
  })
})
