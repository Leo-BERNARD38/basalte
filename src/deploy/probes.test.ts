import { describe, expect, it } from 'vitest'

import { defineSite, type Site } from '../site/define.js'
import { VARIABLES, type Environment } from '../server/email/provider.js'
import { diagnose, type Probe } from './probes.js'

const SITE: Site = defineSite({
  name: 'Atelier Duvallon',
  domain: 'atelier-duvallon.fr',
  languages: { fr: { default: true }, en: { draft: true } },
})

const FILLED: Environment = {
  [VARIABLES.key]: 'cle-du-site',
  [VARIABLES.from]: 'bonjour@atelier-duvallon.fr',
  [VARIABLES.contact]: 'contact@atelier-duvallon.fr',
  [VARIABLES.admin]: 'leo@exemple.fr',
}

async function probes(
  environment: Environment,
  parts: { host?: string; resolved?: readonly string[]; site?: Site } = {},
): Promise<Map<string, Probe>> {
  const found = await diagnose({
    root: 'un-dossier-qui-n-est-pas-un-depot',
    site: parts.site ?? SITE,
    environment,
    ...(parts.host === undefined ? {} : { host: parts.host }),
    send: false,
    resolve: async (domain) => {
      if (parts.resolved === undefined) throw new Error(`${domain} inconnu`)

      return parts.resolved
    },
  })

  return new Map(found.map((probe) => [probe.label, probe]))
}

describe('configuration', () => {
  it('nomme le site, son domaine et l’état de ses langues', async () => {
    const probe = (await probes(FILLED)).get('site.config.ts')

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('atelier-duvallon.fr')
    expect(probe?.detail).toContain('en en préparation')
  })
})

describe('.env', () => {
  it('refuse une configuration email vide, en nommant la variable', async () => {
    const probe = (await probes({})).get('.env')

    expect(probe?.level).toBe('error')
    expect(probe?.detail).toContain(VARIABLES.key)
    expect(probe?.fix).toBeDefined()
  })

  it('signale que les codes de connexion partagent la clé du formulaire', async () => {
    const probe = (await probes(FILLED)).get('canaux email')

    expect(probe?.level).toBe('warning')
    expect(probe?.fix).toContain(VARIABLES.authKey)
  })

  it('ne parle pas de clé partagée quand il n’y en a aucune', async () => {
    expect((await probes({})).has('canaux email')).toBe(false)
  })

  it('se tait quand les deux canaux ont leur propre clé', async () => {
    const probe = (
      await probes({ ...FILLED, [VARIABLES.authKey]: 'cle-de-connexion' })
    ).get('canaux email')

    expect(probe?.level).toBe('ok')
  })

  it('avertit qu’un message ne serait notifié à personne', async () => {
    const probe = (await probes({})).get(VARIABLES.contact)

    expect(probe?.level).toBe('warning')
    expect(probe?.detail).toContain('panel')
  })
})

describe('email', () => {
  it('ne prétend rien prouver quand rien ne peut partir', async () => {
    const probe = (await probes({})).get('email')

    expect(probe?.level).toBe('warning')
    expect(probe?.detail).toContain('non éprouvé')
  })

  it('dit que l’envoi a été sauté plutôt que de le taire', async () => {
    const probe = (await probes(FILLED)).get('email')

    expect(probe?.level).toBe('warning')
    expect(probe?.detail).toContain('--no-email')
  })
})

describe('DNS', () => {
  it('compare l’enregistrement à l’adresse attendue', async () => {
    const probe = (
      await probes(FILLED, { host: '5.6.7.8', resolved: ['1.2.3.4'] })
    ).get('DNS')

    expect(probe?.level).toBe('error')
    expect(probe?.detail).toContain('1.2.3.4')
    expect(probe?.detail).toContain('5.6.7.8')
    expect(probe?.fix).toContain('enregistrement A')
  })

  it('accepte quand le domaine pointe vers la machine', async () => {
    const probe = (
      await probes(FILLED, { host: '1.2.3.4', resolved: ['1.2.3.4'] })
    ).get('DNS')

    expect(probe?.level).toBe('ok')
  })

  it('échoue franchement quand le domaine ne se résout pas', async () => {
    const probe = (await probes(FILLED, { host: '1.2.3.4' })).get('DNS')

    expect(probe?.level).toBe('error')
  })
})

describe('dépôt git', () => {
  it('refuse un dossier sans branche distante suivie', async () => {
    const probe = (await probes(FILLED)).get('dépôt git')

    expect(probe?.level).toBe('error')
    expect(probe?.fix).toContain('push --set-upstream')
  })
})

describe('la capacité « notifyLeads »', () => {
  it('ne réclame pas d’adresse de contact quand le site ne notifie pas', async () => {
    const probe = (
      await probes(
        {},
        {
          site: defineSite({
            name: 'Atelier Duvallon',
            domain: 'atelier-duvallon.fr',
            languages: { fr: { default: true } },
            capabilities: { notifyLeads: false },
          }),
        },
      )
    ).get(VARIABLES.contact)

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('sans objet')
  })
})
