import { describe, expect, it } from 'vitest'

import { defineSite, type Site } from '../site/define.js'
import { VARIABLES, type Environment } from '../server/email/provider.js'
import { WEBHOOK_VARIABLE } from '../server/webhook.js'
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
  parts: {
    host?: string
    resolved?: readonly string[]
    site?: Site
    /** Les enregistrements TXT du faux DNS, par nom. Absent, le nom ne répond pas. */
    text?: Readonly<Record<string, readonly string[]>>
  } = {},
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
    resolveText: async (name) => {
      const records = parts.text?.[name]

      if (records === undefined) throw new Error(`${name} inconnu`)

      return records
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

describe('l’adresse de notification', () => {
  it('est sans objet quand le site n’en déclare aucune', async () => {
    const probe = (await probes(FILLED)).get(WEBHOOK_VARIABLE)

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('sans objet')
  })

  it('refuse une adresse qui n’en est pas une', async () => {
    const probe = (
      await probes({ ...FILLED, [WEBHOOK_VARIABLE]: 'http://exemple.test/x' })
    ).get(WEBHOOK_VARIABLE)

    expect(probe?.level).toBe('error')
    expect(probe?.detail).toContain('https')
  })

  // `--no-email` saute tous les envois réels, celui-ci compris : le banc pose
  // `send: false`, et la sonde dit où l’adresse mène sans l’appeler.
  it('nomme l’hôte sans l’appeler quand l’envoi est sauté', async () => {
    const probe = (
      await probes({
        ...FILLED,
        [WEBHOOK_VARIABLE]: 'https://exemple.test/crochet',
      })
    ).get(WEBHOOK_VARIABLE)

    expect(probe?.level).toBe('warning')
    expect(probe?.detail).toContain('exemple.test')
  })
})

describe('le canal des messages', () => {
  const quiet = defineSite({
    name: 'Atelier Duvallon',
    domain: 'atelier-duvallon.fr',
    languages: { fr: { default: true } },
    capabilities: { notifyLeads: false },
  })

  // Le site a coupé l’email et n’a rien mis à la place : deux lignes plus haut
  // disent « sans objet », et personne ne serait prévenu.
  it('avertit quand rien ne préviendrait le client', async () => {
    const probe = (
      await probes(
        { [VARIABLES.key]: 'cle', [VARIABLES.from]: 'a@b.fr' },
        { site: quiet },
      )
    ).get('canal des messages')

    expect(probe?.level).toBe('warning')
    expect(probe?.fix).toContain(WEBHOOK_VARIABLE)
  })

  // La ligne CONTACT_EMAIL porte déjà l’avertissement : le répéter noierait ce
  // qu’il faut corriger.
  it('se tait quand l’adresse de contact avertit déjà', async () => {
    const found = await probes({
      [VARIABLES.key]: 'cle',
      [VARIABLES.from]: 'a@b.fr',
    })

    expect(found.get('canal des messages')).toBeUndefined()
    expect(found.get(VARIABLES.contact)?.level).toBe('warning')
    expect(found.get(VARIABLES.contact)?.fix).toContain(WEBHOOK_VARIABLE)
  })

  it('se tait dès qu’une adresse de notification existe, sans email', async () => {
    const found = await probes(
      {
        [VARIABLES.key]: 'cle',
        [VARIABLES.from]: 'a@b.fr',
        [WEBHOOK_VARIABLE]: 'https://exemple.test/crochet',
      },
      { site: quiet },
    )

    expect(found.get('canal des messages')).toBeUndefined()
    expect(found.get(VARIABLES.contact)?.detail).toContain('prévient ailleurs')
  })
})

// Ce qui refuse est DKIM : Brevo expédie sous son propre domaine d’enveloppe,
// si bien que sa signature est la seule authentification qui reste. SPF et
// DMARC avertissent — ils améliorent la réception, ils ne la conditionnent pas.
describe('la délivrabilité', () => {
  const SPF = 'SPF (atelier-duvallon.fr)'
  const DKIM = 'DKIM (atelier-duvallon.fr)'
  const DMARC = 'DMARC (atelier-duvallon.fr)'

  const signed = {
    'brevo1._domainkey.atelier-duvallon.fr': ['v=DKIM1; k=rsa; p=MIGf'],
  }

  it('ne sonde rien quand aucune adresse n’expédie', async () => {
    const found = await probes({ [VARIABLES.admin]: 'leo@exemple.fr' })

    expect(found.get(SPF)).toBeUndefined()
    expect(found.get(DKIM)).toBeUndefined()
  })

  it('refuse un domaine dont les emails ne sont pas signés', async () => {
    const probe = (await probes(FILLED, { text: {} })).get(DKIM)

    expect(probe?.level).toBe('error')
    expect(probe?.detail).toContain('brevo1')
    expect(probe?.fix).toContain('site.config.ts')
  })

  it('accepte dès qu’un sélecteur porte une clé', async () => {
    const probe = (await probes(FILLED, { text: signed })).get(DKIM)

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('brevo1')
  })

  it('sonde le sélecteur que le site déclare, plutôt que ceux du socle', async () => {
    const site = defineSite({
      name: 'Atelier Duvallon',
      domain: 'atelier-duvallon.fr',
      languages: { fr: { default: true } },
      email: { provider: 'brevo', dkim: ['maison'] },
    })

    const found = await probes(FILLED, {
      site,
      text: {
        ...signed,
        'maison._domainkey.atelier-duvallon.fr': ['v=DKIM1; k=rsa; p=AAAA'],
      },
    })

    expect(found.get(DKIM)?.level).toBe('ok')
    expect(found.get(DKIM)?.detail).toContain('maison')
  })

  it('avertit d’un domaine sans SPF, sans refuser', async () => {
    const probe = (await probes(FILLED, { text: signed })).get(SPF)

    expect(probe?.level).toBe('warning')
    expect(probe?.fix).toContain('v=spf1')
  })

  // Brevo ne demande pas d’include : un SPF qui ne le nomme pas est correct,
  // et le dire en avertissement enverrait corriger ce qui n’est pas cassé.
  it('accepte un SPF qui ne nomme pas le fournisseur', async () => {
    const probe = (
      await probes(FILLED, {
        text: {
          ...signed,
          'atelier-duvallon.fr': ['v=spf1 include:_spf.google.com ~all'],
        },
      })
    ).get(SPF)

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('ne demande pas')
  })

  it('avertit d’un DMARC absent, et rend la politique quand il existe', async () => {
    expect((await probes(FILLED, { text: signed })).get(DMARC)?.level).toBe(
      'warning',
    )

    const probe = (
      await probes(FILLED, {
        text: {
          ...signed,
          '_dmarc.atelier-duvallon.fr': ['v=DMARC1; p=quarantine'],
        },
      })
    ).get(DMARC)

    expect(probe?.level).toBe('ok')
    expect(probe?.detail).toContain('quarantine')
  })

  it('sonde aussi le domaine du canal des codes de connexion', async () => {
    const found = await probes(
      { ...FILLED, [VARIABLES.authFrom]: 'connexion@compte.exemple.fr' },
      { text: signed },
    )

    expect(found.get('DKIM (compte.exemple.fr)')?.level).toBe('error')
  })
})
