import { describe, expect, it } from 'vitest'

import { accountById, createAccount, LOCK_AFTER } from './account.js'
import {
  ELSEWHERE,
  EMAIL,
  harness,
  HERE,
  PASSWORD,
  START,
} from './auth.fixture.js'
import { trustDevice } from './device.js'
import { MINUTE } from './durations.js'
import { recentEntries } from './journal.js'
import {
  CODE_LIFETIME,
  CODE_TRIES,
  createRescue,
  NOTICE_AFTER,
  RESCUE_LIFETIME,
  signIn,
  submitCode,
  useRescue,
} from './login.js'
import { fingerprint } from './secrets.js'
import { readSession } from './session.js'
import { RULES } from './throttle.js'

describe('signIn — mot de passe', () => {
  it('envoie un code et ouvre une tentative', async () => {
    const bench = await harness()

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    expect(result.kind).toBe('code-sent')
    expect(bench.email.sent).toHaveLength(1)
    expect(bench.email.last()?.to).toBe(EMAIL)
    expect(bench.code()).toMatch(/^\d{6}$/)

    bench.close()
  })

  it('ne met jamais le code dans l’objet de l’email', async () => {
    const bench = await harness()

    await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    expect(bench.email.last()?.subject).not.toContain(bench.code())

    bench.close()
  })

  it('ne garde que l’empreinte du jeton de tentative', async () => {
    const bench = await harness()

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    if (result.kind !== 'code-sent') throw new Error('code attendu')

    expect(
      bench.server.database
        .prepare('select token_hash from login_attempt')
        .get()?.['token_hash'],
    ).toBe(fingerprint(result.attempt))

    bench.close()
  })

  it('refuse un compte inconnu exactement comme un mauvais mot de passe', async () => {
    const bench = await harness()

    const unknown = await signIn(bench.server, {
      email: 'personne@exemple.fr',
      password: PASSWORD,
      origin: HERE,
    })

    const wrong = await signIn(bench.server, {
      email: EMAIL,
      password: 'pas-le-bon-mot-de-passe',
      origin: HERE,
    })

    expect(unknown).toEqual(wrong)
    expect(bench.email.sent).toHaveLength(0)

    bench.close()
  })

  it('accepte une adresse écrite avec une autre casse', async () => {
    const bench = await harness()

    const result = await signIn(bench.server, {
      email: ' Client@Exemple.FR ',
      password: PASSWORD,
      origin: HERE,
    })

    expect(result.kind).toBe('code-sent')

    bench.close()
  })
})

describe('signIn — appareil de confiance', () => {
  it('ouvre la session sans code sur un appareil connu', async () => {
    const bench = await harness()
    const { token } = trustDevice(
      bench.server.database,
      bench.account().id,
      HERE,
      START,
    )

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      device: token,
      origin: HERE,
    })

    expect(result.kind).toBe('signed-in')
    expect(bench.email.sent).toHaveLength(0)

    bench.close()
  })

  it('redemande un code quand le jeton d’appareil vient d’un autre compte', async () => {
    const bench = await harness()
    const other = await createAccount(
      bench.server.database,
      'autre@exemple.fr',
      START,
    )
    const { token } = trustDevice(
      bench.server.database,
      other.account.id,
      HERE,
      START,
    )

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      device: token,
      origin: HERE,
    })

    expect(result.kind).toBe('code-sent')

    bench.close()
  })

  it('redemande un code une fois la confiance expirée', async () => {
    const bench = await harness()
    const { token } = trustDevice(
      bench.server.database,
      bench.account().id,
      HERE,
      START,
    )

    bench.travel(31 * 24 * 60 * MINUTE)

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      device: token,
      origin: HERE,
    })

    expect(result.kind).toBe('code-sent')

    bench.close()
  })
})

describe('submitCode', () => {
  async function upToCode() {
    const bench = await harness()

    const start = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    if (start.kind !== 'code-sent') throw new Error('code attendu')

    return { bench, attempt: start.attempt, code: bench.code() }
  }

  it('ouvre une session utilisable', async () => {
    const { bench, attempt, code } = await upToCode()

    const result = await submitCode(bench.server, {
      attempt,
      code,
      remember: false,
      origin: HERE,
    })

    if (result.kind !== 'signed-in') throw new Error('session attendue')

    expect(
      readSession(bench.server.database, result.session, START)?.accountId,
    ).toBe(bench.account().id)

    bench.close()
  })

  it('refuse de rejouer un code déjà consommé', async () => {
    const { bench, attempt, code } = await upToCode()

    await submitCode(bench.server, {
      attempt,
      code,
      remember: false,
      origin: HERE,
    })

    const again = await submitCode(bench.server, {
      attempt,
      code,
      remember: false,
      origin: HERE,
    })

    expect(again.kind).toBe('refused')

    bench.close()
  })

  it('refuse un code passé sa durée de vie', async () => {
    const { bench, attempt, code } = await upToCode()

    bench.travel(CODE_LIFETIME)

    expect(
      (
        await submitCode(bench.server, {
          attempt,
          code,
          remember: false,
          origin: HERE,
        })
      ).kind,
    ).toBe('refused')

    bench.close()
  })

  it('invalide la tentative après cinq essais, code juste compris', async () => {
    const { bench, attempt, code } = await upToCode()

    for (
      let attemptNumber = 1;
      attemptNumber <= CODE_TRIES;
      attemptNumber += 1
    ) {
      const result = await submitCode(bench.server, {
        attempt,
        code: '000000' === code ? '111111' : '000000',
        remember: false,
        origin: HERE,
      })

      if (result.kind !== 'refused') throw new Error('refus attendu')

      expect(result.remaining).toBe(CODE_TRIES - attemptNumber)
    }

    expect(
      (
        await submitCode(bench.server, {
          attempt,
          code,
          remember: false,
          origin: HERE,
        })
      ).kind,
    ).toBe('refused')

    bench.close()
  })

  it('refuse le code d’une autre tentative', async () => {
    const first = await upToCode()
    const second = await upToCode()

    expect(
      (
        await submitCode(first.bench.server, {
          attempt: first.attempt,
          code: second.code,
          remember: false,
          origin: HERE,
        })
      ).kind,
    ).toBe('refused')

    first.bench.close()
    second.bench.close()
  })

  it('refuse un jeton de tentative inventé', async () => {
    const { bench, code } = await upToCode()

    expect(
      (
        await submitCode(bench.server, {
          attempt: 'jeton-inventé',
          code,
          remember: false,
          origin: HERE,
        })
      ).kind,
    ).toBe('refused')

    bench.close()
  })

  it('retient l’appareil et prévient par email quand on le demande', async () => {
    const { bench, attempt, code } = await upToCode()

    const result = await submitCode(bench.server, {
      attempt,
      code,
      remember: true,
      origin: HERE,
    })

    if (result.kind !== 'signed-in') throw new Error('session attendue')

    expect(result.device).toBeDefined()
    expect(bench.email.last()?.subject).toContain('Nouvel appareil')

    bench.close()
  })

  it('ne retient rien quand on ne le demande pas', async () => {
    const { bench, attempt, code } = await upToCode()

    const result = await submitCode(bench.server, {
      attempt,
      code,
      remember: false,
      origin: HERE,
    })

    if (result.kind !== 'signed-in') throw new Error('session attendue')

    expect(result.device).toBeUndefined()
    expect(bench.email.sent).toHaveLength(1)

    bench.close()
  })
})

describe('limitation de débit', () => {
  it('coupe après trois codes demandés dans le quart d’heure', async () => {
    const bench = await harness()

    for (let ask = 0; ask < RULES.code.limit; ask += 1) {
      expect(
        (
          await signIn(bench.server, {
            email: EMAIL,
            password: PASSWORD,
            origin: HERE,
          })
        ).kind,
      ).toBe('code-sent')
    }

    const refused = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    expect(refused.kind).toBe('refused')
    expect(bench.email.sent).toHaveLength(RULES.code.limit)

    bench.close()
  })

  it('coupe une adresse qui martèle, avant même de chercher le compte', async () => {
    const bench = await harness()

    for (let attempt = 0; attempt < RULES.address.limit; attempt += 1) {
      await signIn(bench.server, {
        email: `inconnu${attempt}@exemple.fr`,
        password: 'x',
        origin: HERE,
      })
    }

    const refused = await signIn(bench.server, {
      email: 'inconnu@exemple.fr',
      password: 'x',
      origin: HERE,
    })

    expect(refused.kind).toBe('refused')
    if (refused.kind !== 'refused') throw new Error('refus attendu')
    expect(refused.retryAt).toBeGreaterThan(START)

    bench.close()
  })
})

describe('verrouillage', () => {
  it('bloque le compte après cinq mots de passe faux, et prévient', async () => {
    const bench = await harness()

    for (let attempt = 0; attempt < LOCK_AFTER; attempt += 1) {
      await signIn(bench.server, {
        email: EMAIL,
        password: 'pas-le-bon-mot-de-passe',
        origin: HERE,
      })
    }

    expect(bench.email.sent).toHaveLength(1)
    expect(bench.email.last()?.subject).toContain('échouées')
    expect(bench.email.last()?.text).toContain(String(NOTICE_AFTER))

    const locked = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    expect(locked.kind).toBe('refused')
    if (locked.kind !== 'refused') throw new Error('refus attendu')
    expect(locked.retryAt).toBeGreaterThan(START)

    bench.close()
  })

  it('laisse repasser une fois le blocage écoulé', async () => {
    const bench = await harness()

    for (let attempt = 0; attempt < LOCK_AFTER; attempt += 1) {
      await signIn(bench.server, {
        email: EMAIL,
        password: 'pas-le-bon-mot-de-passe',
        origin: HERE,
      })
    }

    bench.travel(2 * MINUTE)

    expect(
      (
        await signIn(bench.server, {
          email: EMAIL,
          password: PASSWORD,
          origin: HERE,
        })
      ).kind,
    ).toBe('code-sent')

    bench.close()
  })
})

describe('lien de secours', () => {
  it('ouvre une session, une seule fois', async () => {
    const bench = await harness()
    const { token } = createRescue(bench.server, EMAIL)

    const first = useRescue(bench.server, token, HERE)

    expect(first.kind).toBe('signed-in')
    expect(useRescue(bench.server, token, HERE).kind).toBe('refused')

    bench.close()
  })

  it('expire au bout de dix minutes', async () => {
    const bench = await harness()
    const { token, expiresAt } = createRescue(bench.server, EMAIL)

    expect(expiresAt).toBe(START + RESCUE_LIFETIME)

    bench.travel(RESCUE_LIFETIME)

    expect(useRescue(bench.server, token, HERE).kind).toBe('refused')

    bench.close()
  })

  it('débloque un compte verrouillé', async () => {
    const bench = await harness()

    for (let attempt = 0; attempt <= LOCK_AFTER; attempt += 1) {
      await signIn(bench.server, {
        email: EMAIL,
        password: 'pas-le-bon-mot-de-passe',
        origin: HERE,
      })
    }

    const { token } = createRescue(bench.server, EMAIL)

    expect(useRescue(bench.server, token, HERE).kind).toBe('signed-in')
    expect(
      accountById(bench.server.database, bench.account().id)?.lockedUntil,
    ).toBe(0)

    bench.close()
  })

  it('refuse un jeton inventé', async () => {
    const bench = await harness()

    expect(useRescue(bench.server, 'jeton-inventé', HERE).kind).toBe('refused')

    bench.close()
  })

  it('nomme l’adresse quand aucun compte ne correspond', async () => {
    const bench = await harness()

    expect(() => createRescue(bench.server, 'personne@exemple.fr')).toThrow(
      'personne@exemple.fr',
    )

    bench.close()
  })
})

describe('journal', () => {
  it('garde la trace de chaque étape, avec son origine', async () => {
    const bench = await harness()

    const start = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    if (start.kind !== 'code-sent') throw new Error('code attendu')

    await submitCode(bench.server, {
      attempt: start.attempt,
      code: '000000' === bench.code() ? '111111' : '000000',
      remember: false,
      origin: ELSEWHERE,
    })

    await submitCode(bench.server, {
      attempt: start.attempt,
      code: bench.code(),
      remember: true,
      origin: HERE,
    })

    const entries = recentEntries(bench.server.database, bench.account().id, 10)

    expect(entries.map((entry) => entry.outcome)).toEqual([
      'device-trusted',
      'signed-in',
      'code-rejected',
      'code-sent',
    ])

    expect(entries.at(-2)?.ip).toBe(ELSEWHERE.ip)

    bench.close()
  })

  it('note un mot de passe refusé sans rattacher de compte à un inconnu', async () => {
    const bench = await harness()

    await signIn(bench.server, {
      email: 'personne@exemple.fr',
      password: 'x',
      origin: HERE,
    })

    const row = bench.server.database
      .prepare('select account_id, email, outcome from journal')
      .get()

    expect(row?.['account_id']).toBeNull()
    expect(row?.['email']).toBe('personne@exemple.fr')
    expect(row?.['outcome']).toBe('password-rejected')

    bench.close()
  })
})

describe('panne d’email', () => {
  it('laisse la tentative ouverte quand l’envoi échoue', async () => {
    const bench = await harness()

    bench.server.email.send = async () => {
      throw new Error('quota épuisé')
    }

    const result = await signIn(bench.server, {
      email: EMAIL,
      password: PASSWORD,
      origin: HERE,
    })

    expect(result.kind).toBe('code-sent')

    bench.close()
  })
})
