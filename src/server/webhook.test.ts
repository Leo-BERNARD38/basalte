import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Lead } from './leads.js'
import {
  payload,
  proofLead,
  webhookNotifier,
  webhookUrl,
  WEBHOOK_VARIABLE,
} from './webhook.js'

const LEAD: Lead = {
  id: 12,
  at: Date.UTC(2026, 7, 29, 9, 0, 0),
  name: 'Camille',
  email: 'camille@exemple.fr',
  message: 'Bonjour, je cherche un devis pour une véranda.',
  page: '/contact',
  language: 'fr',
  ip: '203.0.113.7',
  agent: 'Firefox/142.0',
  delivery: 'failed',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('webhookUrl', () => {
  it('rend l’adresse déclarée, sans les blancs qui l’entourent', () => {
    expect(webhookUrl({ [WEBHOOK_VARIABLE]: ' https://exemple.test/x ' })).toBe(
      'https://exemple.test/x',
    )
  })

  it('rend une chaîne vide quand rien n’est déclaré', () => {
    expect(webhookUrl({})).toBe('')
  })
})

describe('webhookNotifier', () => {
  it('refuse une adresse qui n’en est pas une', () => {
    expect(() => webhookNotifier('pas-une-adresse')).toThrow(WEBHOOK_VARIABLE)
  })

  it('refuse http : le message porte le nom et l’adresse du visiteur', () => {
    expect(() => webhookNotifier('http://exemple.test/x')).toThrow('https')
  })

  it('n’expose que l’hôte, jamais l’adresse entière', () => {
    expect(webhookNotifier('https://exemple.test/secret-xyz').host).toBe(
      'exemple.test',
    )
  })

  it('poste le message en JSON, sans suivre de redirection', async () => {
    const calls: [string, RequestInit][] = []

    vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
      calls.push([String(url), init])

      return new Response('', { status: 200 })
    })

    await webhookNotifier('https://exemple.test/crochet').send(LEAD)

    const [url, init] = calls[0] ?? ['', {}]
    const headers = init.headers as Record<string, string>

    expect(url).toBe('https://exemple.test/crochet')
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('error')
    expect(headers['content-type']).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual(payload(LEAD))
  })

  it('lève en citant le refus', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('adresse inconnue', { status: 404 }),
    )

    await expect(
      webhookNotifier('https://exemple.test/crochet').send(LEAD),
    ).rejects.toThrow('404')
  })
})

describe('le corps envoyé', () => {
  it('porte le message entier, et les champs qui le décrivent', () => {
    const body = payload(LEAD)

    expect(body.name).toBe(LEAD.name)
    expect(body.email).toBe(LEAD.email)
    expect(body.message).toBe(LEAD.message)
    expect(body.page).toBe(LEAD.page)
    expect(body.language).toBe(LEAD.language)
    expect(body.at).toBe(LEAD.at)
  })

  // Slack, Mattermost et Google Chat lisent `text` ; Discord lit `content`.
  // Les deux portent la même phrase, ce qui fait qu’un webhook affiche quelque
  // chose sans intermédiaire, quel que soit le service au bout.
  it('dit la même chose sous « text » et sous « content »', () => {
    const body = payload(LEAD)

    expect(body.content).toBe(body.text)
    expect(body.text).toContain(LEAD.name)
    expect(body.text).toContain(LEAD.email)
    expect(body.text).toContain(LEAD.message)
  })

  it('ne fait jamais sortir l’adresse IP ni le navigateur du visiteur', () => {
    const body = JSON.stringify(payload(LEAD))

    expect(body).not.toContain(LEAD.ip)
    expect(body).not.toContain(LEAD.agent)
  })
})

describe('proofLead', () => {
  it('nomme le site et se dit vérification', () => {
    const proof = proofLead('Atelier Dubois', 1_000)

    expect(payload(proof).text).toContain('Atelier Dubois')
    expect(proof.at).toBe(1_000)
  })
})
