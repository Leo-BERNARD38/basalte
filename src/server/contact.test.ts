import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import {
  ADDRESS_RULE,
  handleContact,
  MARKERS,
  MAX_FORM_BYTES,
} from './contact.js'
import { listLeads } from './leads.js'
import { bench, defaultPage, ORIGIN } from './panel.fixture.js'

const COMPONENT = fileURLToPath(
  new URL('../blocks/contact/Contact.astro', import.meta.url),
)

const SENT = `#${MARKERS.sent}`

const VALID = {
  name: 'Camille Roux',
  email: 'camille@exemple.fr',
  message: 'Bonjour, je voudrais un devis pour une terrasse.',
}

function contactPage(): Readonly<Record<string, unknown>> {
  return {
    ...defaultPage(),
    blocks: [
      {
        id: 'c1',
        type: 'contact',
        hidden: {},
        props: {},
      },
    ],
  }
}

describe('le formulaire de contact', () => {
  it('enregistre le message et le notifie au client', async () => {
    const site = await bench()
    const response = await site.submit({ ...VALID, page: '/' })

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`/${SENT}`)

    const leads = listLeads(site.panel.server.database, 10)

    expect(leads).toHaveLength(1)
    expect(leads[0]?.email).toBe(VALID.email)
    expect(leads[0]?.message).toBe(VALID.message)
    expect(leads[0]?.page).toBe('/')
    expect(leads[0]?.delivery).toBe('sent')

    const letter = site.mail.last()

    expect(letter?.to).toBe('client@exemple.fr')
    expect(letter?.replyTo).toBe(VALID.email)
    expect(letter?.text).toContain(VALID.message)

    await site.close()
  })

  it('garde le message quand l’envoi échoue', async () => {
    const site = await bench()

    site.mail.send = async () => {
      throw new Error('Brevo ne répond pas')
    }

    const response = await site.submit(VALID)

    expect(response.headers.get('location')).toBe(`/${SENT}`)

    const leads = listLeads(site.panel.server.database, 10)

    expect(leads).toHaveLength(1)
    expect(leads[0]?.delivery).toBe('failed')

    await site.close()
  })

  it('garde le message quand aucun destinataire n’est configuré', async () => {
    const site = await bench({ contactTo: '' })

    await site.submit(VALID)

    expect(listLeads(site.panel.server.database, 10)).toHaveLength(1)
    expect(site.mail.sent).toHaveLength(0)

    await site.close()
  })

  it('refuse un formulaire incomplet sans rien écrire', async () => {
    const site = await bench()

    const response = await site.submit({
      ...VALID,
      email: 'pas-une-adresse',
    })

    expect(response.headers.get('location')).toBe(`/#${MARKERS.refused}`)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    await site.close()
  })

  it('refuse un message trop court', async () => {
    const site = await bench()
    const response = await site.submit({ ...VALID, message: '   salut   ' })

    expect(response.headers.get('location')).toBe(`/#${MARKERS.refused}`)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    await site.close()
  })

  it('taille les valeurs avant de les garder', async () => {
    const site = await bench()

    await site.submit({
      ...VALID,
      name: '  Camille Roux  ',
      message: `  ${VALID.message}  `,
    })

    const lead = listLeads(site.panel.server.database, 10)[0]

    expect(lead?.name).toBe('Camille Roux')
    expect(lead?.message).toBe(VALID.message)

    await site.close()
  })

  // Le leurre ne dit jamais qu’il a servi : un robot lit exactement la même
  // réponse qu’un envoi réussi.
  it('avale un envoi qui remplit le champ leurre', async () => {
    const site = await bench()

    const response = await site.submit({
      ...VALID,
      website: 'https://spam.example',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`/${SENT}`)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)
    expect(site.mail.sent).toHaveLength(0)

    await site.close()
  })

  it('avale le leurre même quand le reste du formulaire est cassé', async () => {
    const site = await bench()

    const response = await site.submit({
      email: 'x',
      website: 'https://spam.example',
    })

    expect(response.headers.get('location')).toBe(`/${SENT}`)

    await site.close()
  })

  it('ferme le robinet après un nombre d’envois par adresse', async () => {
    const site = await bench()

    for (let attempt = 0; attempt < ADDRESS_RULE.limit; attempt += 1) {
      const allowed = await site.submit(VALID)

      expect(allowed.headers.get('location')).toBe(`/${SENT}`)
    }

    const refused = await site.submit(VALID)

    expect(refused.headers.get('location')).toBe(`/#${MARKERS.waiting}`)
    expect(listLeads(site.panel.server.database, 50)).toHaveLength(
      ADDRESS_RULE.limit,
    )

    await site.close()
  })

  it('rouvre le robinet à la fenêtre suivante', async () => {
    const site = await bench()

    for (let attempt = 0; attempt <= ADDRESS_RULE.limit; attempt += 1) {
      await site.submit(VALID)
    }

    site.harness.travel(ADDRESS_RULE.window)

    const response = await site.submit(VALID)

    expect(response.headers.get('location')).toBe(`/${SENT}`)

    await site.close()
  })

  it('renvoie vers la page d’où part le formulaire', async () => {
    const site = await bench({ pages: { contact: contactPage() } })
    const response = await site.submit({ ...VALID, page: '/contact/' })

    expect(response.headers.get('location')).toBe(`/contact/${SENT}`)
    expect(listLeads(site.panel.server.database, 10)[0]?.page).toBe('/contact')

    await site.close()
  })

  // L’adresse de retour est reconstruite depuis les pages du dépôt : ce qui a
  // été envoyé ne peut pas devenir une redirection vers ailleurs.
  it('ramène à la racine plutôt que vers une adresse soufflée', async () => {
    const site = await bench()

    for (const page of [
      'https://evil.example/piege',
      '//evil.example',
      '/../../etc',
      'contact',
    ]) {
      const response = await site.submit({ ...VALID, page })

      expect(response.headers.get('location')).toBe(`/${SENT}`)
    }

    await site.close()
  })

  it('refuse un envoi venu d’un autre site', async () => {
    const site = await bench()

    const response = await site.submit(VALID, {
      origin: 'https://ailleurs.test',
    })

    expect(response.status).toBe(403)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    await site.close()
  })

  it('refuse un envoi sans origine annoncée', async () => {
    const site = await bench()
    const response = await site.submit(VALID, { origin: null })

    expect(response.status).toBe(403)

    await site.close()
  })

  it('ne répond qu’au POST', async () => {
    const site = await bench()

    const response = await handleContact(
      site.panel,
      new Request(`${ORIGIN}/api/contact`, {
        method: 'GET',
        headers: { origin: ORIGIN },
      }),
    )

    expect(response?.status).toBe(405)

    await site.close()
  })

  it('laisse passer une adresse qui n’est pas la sienne', async () => {
    const site = await bench()

    const response = await handleContact(
      site.panel,
      new Request(`${ORIGIN}/api/panel`, { method: 'POST' }),
    )

    expect(response).toBeUndefined()

    await site.close()
  })

  it('n’exige aucune session', async () => {
    const site = await bench()
    const response = await site.submit(VALID)

    expect(response.status).toBe(303)

    await site.close()
  })

  it('accepte une page dont le contenu ne passe pas la validation', async () => {
    const site = await bench({
      content: { $format: CONTENT_FORMAT, meta: { title: { fr: '' } } },
    })

    const response = await site.submit(VALID)

    expect(response.status).toBe(303)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(1)

    await site.close()
  })
})

// Les identifiants que la page révèle et ceux que le serveur écrit dans la
// redirection sont un seul contrat : le bloc ne peut pas importer le module du
// serveur, ce test le tient à sa place.
describe('le bloc et l’endpoint', () => {
  it('nomment les mêmes réponses', async () => {
    const component = await readFile(COMPONENT, 'utf8')

    for (const marker of Object.values(MARKERS)) {
      expect(component).toContain(`id="${marker}"`)
    }
  })

  it('poste vers l’adresse que le serveur écoute, sans un script', async () => {
    const component = await readFile(COMPONENT, 'utf8')

    expect(component).toContain('action="/api/contact"')
    expect(component).not.toContain('<script')
  })
})

describe('la taille du corps', () => {
  // `formData` met le corps en mémoire en entier : une requête qui n’annonce
  // pas sa longueur ferait lire sans limite la seule adresse ouverte à un
  // anonyme. Un navigateur, lui, l’annonce toujours.
  it('refuse un envoi qui n’annonce pas sa longueur', async () => {
    const site = await bench()

    const response = await handleContact(
      site.panel,
      new Request(`${ORIGIN}/api/contact`, {
        method: 'POST',
        headers: {
          origin: ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ ...VALID, page: '/' }).toString(),
      }),
    )

    expect(response?.status).toBe(413)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(0)

    await site.close()
  })

  it('refuse un envoi qui en annonce une trop grande', async () => {
    const site = await bench()

    const response = await handleContact(
      site.panel,
      new Request(`${ORIGIN}/api/contact`, {
        method: 'POST',
        headers: {
          origin: ORIGIN,
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': String(MAX_FORM_BYTES + 1),
        },
        body: new URLSearchParams({ ...VALID, page: '/' }).toString(),
      }),
    )

    expect(response?.status).toBe(413)

    await site.close()
  })
})

describe('la capacité « notifyLeads »', () => {
  it('garde le message au panel sans rien envoyer quand elle est éteinte', async () => {
    const site = await bench({
      content: contactPage(),
      capabilities: { notifyLeads: false },
    })

    const response = await site.submit(VALID)

    expect(response.headers.get('location')).toBe(`/${SENT}`)
    expect(listLeads(site.panel.server.database, 10)).toHaveLength(1)
    expect(site.mail.sent).toHaveLength(0)

    await site.close()
  })
})
