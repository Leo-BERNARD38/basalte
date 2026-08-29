import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { AudienceReport } from '../analytics/report.js'
import { DAY, MINUTE } from './durations.js'
import { record } from './journal.js'
import { countUnread, listLeads } from './leads.js'
import type { LeadSummary } from './panel.js'
import { bench } from './panel.fixture.js'
import { purgeBefore, purgeNow } from './purge.js'

const VALID = {
  name: 'Camille Roux',
  email: 'camille@exemple.fr',
  message: 'Bonjour, je voudrais un devis pour une terrasse.',
}

async function leadsOf(
  site: Awaited<ReturnType<typeof bench>>,
): Promise<readonly LeadSummary[]> {
  const response = await site.call('GET', '/api/leads')
  const payload = (await response.json()) as {
    readonly leads: readonly LeadSummary[]
  }

  return payload.leads
}

describe('les messages dans le panel', () => {
  it('les liste du plus récent au plus ancien', async () => {
    const site = await bench()

    await site.submit({ ...VALID, message: 'Le premier message, en entier.' })
    site.harness.travel(MINUTE)
    await site.submit({ ...VALID, message: 'Le second message, en entier.' })

    const leads = await leadsOf(site)

    expect(leads).toHaveLength(2)
    expect(leads[0]?.message).toContain('second')
    expect(leads[1]?.message).toContain('premier')

    await site.close()
  })

  // L’adresse IP est gardée en base pour le jour où un envoi doit se
  // retracer ; elle n’a rien à faire dans un écran, et n’en sort pas.
  it('ne sortent ni l’adresse IP ni le navigateur', async () => {
    const site = await bench()

    await site.submit(VALID)

    const [lead] = await leadsOf(site)

    expect(lead).toBeDefined()
    expect(lead).not.toHaveProperty('ip')
    expect(lead).not.toHaveProperty('agent')

    await site.close()
  })

  it('comptent les non-lus, et se marquent lus', async () => {
    const site = await bench()

    await site.submit(VALID)

    const [lead] = await leadsOf(site)
    const before = await site.call('GET', '/api/panel')

    expect(((await before.json()) as { unread: number }).unread).toBe(1)

    const marked = await site.call('PATCH', `/api/leads/${lead?.id}`, {})

    expect(marked.status).toBe(200)
    expect(countUnread(site.panel.server.database)).toBe(0)

    const after = await leadsOf(site)

    expect(after[0]?.readAt).toBe(site.harness.travel(0))

    await site.close()
  })

  it('se suppriment, définitivement', async () => {
    const site = await bench()

    await site.submit(VALID)

    const [lead] = await leadsOf(site)
    const removed = await site.call('DELETE', `/api/leads/${lead?.id}`)

    expect(removed.status).toBe(200)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    const again = await site.call('DELETE', `/api/leads/${lead?.id}`)

    expect(again.status).toBe(404)

    await site.close()
  })

  it('refusent un identifiant qui n’en est pas un', async () => {
    const site = await bench()
    const response = await site.call('DELETE', '/api/leads/abc')

    expect(response.status).toBe(404)

    await site.close()
  })

  it('ne s’ouvrent à personne sans session', async () => {
    const site = await bench()

    await site.submit(VALID)

    const response = await site.call('GET', '/api/leads', undefined, {
      cookie: false,
    })

    expect(response.status).toBe(401)

    await site.close()
  })

  it('refusent une suppression venue d’un autre site', async () => {
    const site = await bench()

    await site.submit(VALID)

    const [lead] = await leadsOf(site)

    const response = await site.call(
      'DELETE',
      `/api/leads/${lead?.id}`,
      undefined,
      { origin: 'https://ailleurs.test' },
    )

    expect(response.status).toBe(403)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(1)

    await site.close()
  })

  it('annoncent la durée de conservation', async () => {
    const site = await bench()
    const response = await site.call('GET', '/api/panel')

    expect(((await response.json()) as { retention: number }).retention).toBe(
      12,
    )

    await site.close()
  })
})

describe('la purge', () => {
  it('efface ce qui a passé la durée, et garde le reste', async () => {
    const site = await bench()

    await site.submit(VALID)

    const now = site.harness.travel(0)

    expect(purgeNow(site.panel.server.database, 12, now).leads).toBe(0)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(1)

    const later = site.harness.travel(400 * DAY)

    expect(purgeNow(site.panel.server.database, 12, later).leads).toBe(1)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    await site.close()
  })

  it('emporte le journal de connexion avec les messages', async () => {
    const site = await bench()

    await site.submit(VALID)

    record(site.panel.server.database, {
      email: 'client@exemple.fr',
      at: site.harness.travel(0),
      outcome: 'signed-in',
      ip: '198.51.100.0',
      agent: 'Firefox/142.0',
    })

    const purged = purgeNow(
      site.panel.server.database,
      12,
      site.harness.travel(400 * DAY),
    )

    expect(purged).toEqual({ leads: 1, journal: 1 })

    await site.close()
  })

  // Douze mois, c’est la même date l’an prochain — pas trois cent soixante
  // jours.
  it('compte en mois calendaires', () => {
    expect(purgeBefore(Date.UTC(2027, 0, 15), 12)).toBe(Date.UTC(2026, 0, 15))
    expect(purgeBefore(Date.UTC(2026, 5, 10), 1)).toBe(Date.UTC(2026, 4, 10))
  })
})

describe('le rapport d’audience', () => {
  it('dit quand le log n’est pas lisible, plutôt que d’afficher zéro', async () => {
    const site = await bench()
    const audience = await audienceOf(site)

    expect(audience.readable).toBe(false)
    expect(audience.visits).toBe(0)

    await site.close()
  })

  it('compte les visites et les envois du formulaire', async () => {
    const site = await bench()
    const at = site.harness.travel(0) / 1000

    await writeFile(
      path.join(site.root, 'access.log'),
      [
        line(at, 'GET', '/', 200, '198.51.100.0', 'Firefox/142.0'),
        line(at, 'GET', '/contact', 200, '198.51.100.0', 'Firefox/142.0'),
        line(at, 'GET', '/', 200, '203.0.113.0', 'Safari/18.0'),
        line(at, 'GET', '/style.css', 200, '203.0.113.0', 'Safari/18.0'),
        line(at, 'GET', '/', 200, '192.0.2.0', 'Googlebot/2.1'),
        line(at, 'POST', '/api/contact', 303, '198.51.100.0', 'Firefox/142.0'),
        'ceci n’est pas du JSON',
        '',
      ].join('\n'),
      'utf8',
    )

    const audience = await audienceOf(site)

    expect(audience.readable).toBe(true)
    expect(audience.visits).toBe(3)
    expect(audience.visitors).toBe(2)
    expect(audience.forms).toBe(1)
    expect(audience.pages[0]).toEqual({ key: '/', visits: 2 })

    await site.close()
  })
})

function line(
  at: number,
  method: string,
  uri: string,
  status: number,
  ip: string,
  agent: string,
): string {
  return JSON.stringify({
    level: 'info',
    ts: at,
    logger: 'http.log.access.log0',
    msg: 'handled request',
    request: {
      method,
      uri,
      client_ip: ip,
      remote_ip: ip,
      headers: { 'User-Agent': [agent] },
    },
    status,
  })
}

async function audienceOf(
  site: Awaited<ReturnType<typeof bench>>,
): Promise<AudienceReport> {
  const response = await site.call('GET', '/api/stats')
  const payload = (await response.json()) as {
    readonly audience: AudienceReport
  }

  expect(response.status).toBe(200)

  return payload.audience
}

describe('un message qui n’existe pas', () => {
  it('se marque lu par un 404, jamais par un succès silencieux', async () => {
    const site = await bench()
    const response = await site.call('PATCH', '/api/leads/4242', {})

    expect(response.status).toBe(404)

    await site.close()
  })

  it('marquer deux fois reste un succès, et ne bouge pas la date', async () => {
    const site = await bench()

    await site.submit(VALID)

    const [lead] = await leadsOf(site)

    expect(
      (await site.call('PATCH', `/api/leads/${lead?.id}`, {})).status,
    ).toBe(200)

    const first = (await leadsOf(site))[0]?.readAt

    expect(
      (await site.call('PATCH', `/api/leads/${lead?.id}`, {})).status,
    ).toBe(200)
    expect((await leadsOf(site))[0]?.readAt).toBe(first)

    await site.close()
  })
})
