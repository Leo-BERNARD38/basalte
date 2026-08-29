import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { DAY } from '../server/durations.js'
import { isRobot, MAX_BYTES, parseEntry, readAccess } from './access.js'
import { buildReport } from './report.js'

const WORK = fileURLToPath(new URL('../../.tmp/', import.meta.url))
const NOW = Date.UTC(2026, 7, 29, 12, 0, 0)

const LINE = JSON.stringify({
  level: 'info',
  ts: NOW / 1000,
  logger: 'http.log.access.log0',
  msg: 'handled request',
  request: {
    method: 'GET',
    uri: '/contact?utm_source=lettre',
    client_ip: '198.51.100.0',
    remote_ip: '198.51.100.0',
    headers: {
      'User-Agent': ['Mozilla/5.0 Firefox/142.0'],
      Referer: ['https://recherche.example/resultats?q=terrasse'],
    },
  },
  status: 200,
})

const directories: string[] = []

async function work(): Promise<string> {
  const directory = await mkdtemp(path.join(WORK, 'logs-'))

  directories.push(directory)

  return directory
}

afterAll(async () => {
  for (const directory of directories) {
    await rm(directory, { recursive: true, force: true })
  }
})

describe('une ligne de log Caddy', () => {
  it('donne une entrée d’audience', () => {
    const entry = parseEntry(LINE)

    expect(entry).toEqual({
      at: NOW,
      method: 'GET',
      path: '/contact',
      status: 200,
      ip: '198.51.100.0',
      agent: 'Mozilla/5.0 Firefox/142.0',
      referer: 'https://recherche.example/resultats?q=terrasse',
    })
  })

  it('écarte ce qui n’en est pas une', () => {
    for (const line of [
      '',
      '   ',
      'pas du JSON',
      '{"level":"info","msg":"serving initial configuration"}',
      '{"ts":1,"request":{}}',
    ]) {
      expect(parseEntry(line)).toBeUndefined()
    }
  })

  it('reconnaît un robot à sa signature', () => {
    expect(isRobot('Googlebot/2.1')).toBe(true)
    expect(isRobot('curl/8.5.0')).toBe(true)
    expect(isRobot('')).toBe(true)
    expect(isRobot('Mozilla/5.0 Firefox/142.0')).toBe(false)
  })
})

describe('la lecture du log', () => {
  it('ne rend rien quand le fichier n’existe pas', async () => {
    expect(await readAccess(path.join(await work(), 'absent.log'), 0)).toBe(
      undefined,
    )
  })

  it('écarte ce qui précède la date demandée', async () => {
    const file = path.join(await work(), 'access.log')
    const old = { ...JSON.parse(LINE), ts: (NOW - 40 * DAY) / 1000 }

    await writeFile(file, [JSON.stringify(old), LINE, ''].join('\n'), 'utf8')

    const entries = await readAccess(file, NOW - 30 * DAY)

    expect(entries).toHaveLength(1)
    expect(entries?.[0]?.at).toBe(NOW)
  })

  // Le fichier est lu par la fin : la première ligne est alors coupée en son
  // milieu, et elle est écartée plutôt que réparée.
  it('borne ce qu’elle lit et jette la ligne tronquée', async () => {
    const file = path.join(await work(), 'gros.log')
    const lines = Math.ceil(MAX_BYTES / LINE.length) + 10

    await writeFile(file, `${Array(lines).fill(LINE).join('\n')}\n`, 'utf8')

    const entries = await readAccess(file, 0)

    expect(entries).toBeDefined()
    expect(entries?.length).toBeLessThan(lines)
    expect(entries?.every((entry) => entry.path === '/contact')).toBe(true)
  })
})

describe('le rapport', () => {
  const entries = [
    {
      at: NOW,
      method: 'GET',
      path: '/',
      status: 200,
      ip: 'a',
      agent: 'Firefox',
      referer: 'https://recherche.example/q',
    },
    {
      at: NOW,
      method: 'GET',
      path: '/',
      status: 200,
      ip: 'a',
      agent: 'Firefox',
      referer: 'https://banc.test/',
    },
    {
      at: NOW - DAY,
      method: 'GET',
      path: '/contact',
      status: 200,
      ip: 'b',
      agent: 'Safari',
      referer: '',
    },
    {
      at: NOW,
      method: 'GET',
      path: '/absente',
      status: 404,
      ip: 'c',
      agent: 'Safari',
      referer: '',
    },
    {
      at: NOW,
      method: 'GET',
      path: '/admin',
      status: 200,
      ip: 'd',
      agent: 'Safari',
      referer: '',
    },
    {
      at: NOW,
      method: 'GET',
      path: '/logo.webp',
      status: 200,
      ip: 'a',
      agent: 'Firefox',
      referer: '',
    },
    {
      at: NOW - 60 * DAY,
      method: 'GET',
      path: '/',
      status: 200,
      ip: 'z',
      agent: 'Firefox',
      referer: '',
    },
  ]

  const report = buildReport(entries, { host: 'banc.test', now: NOW })

  it('ne compte que ce qu’un visiteur a vu', () => {
    expect(report.visits).toBe(3)
    expect(report.pages).toEqual([
      { key: '/', visits: 2 },
      { key: '/contact', visits: 1 },
    ])
  })

  it('sépare les jours et approche les visiteurs uniques', () => {
    expect(report.days).toHaveLength(2)
    expect(report.visitors).toBe(2)
  })

  it('ne compte pas le site comme sa propre provenance', () => {
    expect(report.referrers).toEqual([{ key: 'recherche.example', visits: 1 }])
  })
})
