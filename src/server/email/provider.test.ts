import { afterEach, describe, expect, it, vi } from 'vitest'

import { brevoProvider } from './brevo.js'
import { consoleProvider } from './console.js'
import { memoryProvider } from './memory.js'
import {
  adminAddress,
  describeMissing,
  readSettings,
  VARIABLES,
} from './provider.js'

const MESSAGE = {
  to: 'client@exemple.fr',
  subject: 'Objet',
  text: 'Texte',
  html: '<p>Texte</p>',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readSettings', () => {
  it('prend la clé du canal d’authentification quand elle existe', () => {
    const auth = readSettings(
      {
        [VARIABLES.key]: 'contact',
        [VARIABLES.authKey]: 'connexion',
        [VARIABLES.from]: 'bonjour@exemple.fr',
        [VARIABLES.authFrom]: 'connexion@exemple.fr',
      },
      'brevo',
      'Atelier',
    )

    expect(auth.key).toBe('connexion')
    expect(auth.from).toBe('connexion@exemple.fr')
  })

  it('retombe sur le canal du formulaire quand il est seul', () => {
    const auth = readSettings(
      { [VARIABLES.key]: 'contact', [VARIABLES.from]: 'bonjour@exemple.fr' },
      'brevo',
      'Atelier',
    )

    expect(auth.key).toBe('contact')
    expect(auth.from).toBe('bonjour@exemple.fr')
  })

  it('rend des chaînes vides plutôt qu’un undefined quand rien n’est posé', () => {
    expect(readSettings({}, 'brevo', 'Atelier')).toEqual({
      provider: 'brevo',
      sender: 'Atelier',
      key: '',
      from: '',
    })
  })
})

describe('readSettings — le canal du site', () => {
  it('ne prend jamais les variables du canal d’authentification', () => {
    const settings = readSettings(
      {
        [VARIABLES.key]: 'clé du site',
        [VARIABLES.from]: 'bonjour@exemple.fr',
        [VARIABLES.authKey]: 'clé des codes',
        [VARIABLES.authFrom]: 'connexion@exemple.fr',
      },
      'brevo',
      'Atelier',
      'site',
    )

    expect(settings.key).toBe('clé du site')
    expect(settings.from).toBe('bonjour@exemple.fr')
  })

  it('reste vide quand seul le canal d’authentification est renseigné', () => {
    const settings = readSettings(
      {
        [VARIABLES.authKey]: 'clé des codes',
        [VARIABLES.authFrom]: 'connexion@exemple.fr',
      },
      'brevo',
      'Atelier',
      'site',
    )

    expect(describeMissing(settings)).toBeDefined()
  })
})

describe('adminAddress', () => {
  it('lit l’adresse où partent les erreurs', () => {
    expect(adminAddress({ [VARIABLES.admin]: ' leo@exemple.fr ' })).toBe(
      'leo@exemple.fr',
    )
    expect(adminAddress({})).toBe('')
  })
})

describe('describeMissing', () => {
  it('nomme la variable qui manque', () => {
    expect(
      describeMissing({
        provider: 'brevo',
        key: '',
        from: 'a@b.fr',
        sender: 'A',
      }),
    ).toContain(VARIABLES.key)

    expect(
      describeMissing({ provider: 'brevo', key: 'k', from: '', sender: 'A' }),
    ).toContain(VARIABLES.from)

    expect(
      describeMissing({
        provider: 'brevo',
        key: 'k',
        from: 'a@b.fr',
        sender: 'A',
      }),
    ).toBeUndefined()
  })
})

describe('memoryProvider', () => {
  it('retient ce qu’on lui donne', async () => {
    const provider = memoryProvider()

    expect(provider.last()).toBeUndefined()

    await provider.send(MESSAGE)

    expect(provider.sent).toHaveLength(1)
    expect(provider.last()).toEqual(MESSAGE)
  })
})

describe('consoleProvider', () => {
  it('écrit le destinataire, l’objet et le texte', async () => {
    const lines: string[] = []

    await consoleProvider((line) => lines.push(line)).send(MESSAGE)

    const written = lines.join('')

    expect(written).toContain(MESSAGE.to)
    expect(written).toContain(MESSAGE.subject)
    expect(written).toContain(MESSAGE.text)
  })
})

describe('brevoProvider', () => {
  const settings = {
    provider: 'brevo',
    key: 'clé-secrète',
    from: 'connexion@exemple.fr',
    sender: 'Atelier',
  }

  it('appelle l’API transactionnelle avec le corps attendu', async () => {
    const calls: [string, RequestInit][] = []

    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push([url, init])

      return new Response('{}', { status: 201 })
    })

    await brevoProvider(settings).send(MESSAGE)

    const [url, init] = calls[0] ?? ['', {}]
    const headers = init.headers as Record<string, string>

    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.method).toBe('POST')
    expect(headers['api-key']).toBe(settings.key)

    expect(JSON.parse(String(init.body))).toEqual({
      sender: { name: 'Atelier', email: settings.from },
      to: [{ email: MESSAGE.to }],
      subject: MESSAGE.subject,
      textContent: MESSAGE.text,
      htmlContent: MESSAGE.html,
    })
  })

  it('lève en citant le refus, sans révéler la clé', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('clé invalide', { status: 401 }),
    )

    await expect(brevoProvider(settings).send(MESSAGE)).rejects.toThrow('401')

    await expect(brevoProvider(settings).send(MESSAGE)).rejects.not.toThrow(
      settings.key,
    )
  })
})
