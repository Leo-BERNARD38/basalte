import { describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import { bench, buildsBadly, defaultPage, IMAGE } from './panel.fixture.js'

describe('GET /api/panel', () => {
  it('décrit le site, ses champs, ses pages et ses médias', async () => {
    const site = await bench()
    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.ok).toBe(true)
    expect(payload.account).toBe('client@exemple.fr')
    expect(payload.site.languages.map((entry: any) => entry.code)).toEqual([
      'fr',
      'en',
    ])
    expect(payload.meta.map((field: any) => field.name)).toEqual([
      'title',
      'description',
      'image',
    ])
    expect(payload.pages).toHaveLength(1)
    expect(payload.pages[0].title).toBe('Accueil')
    expect(payload.media[0].key).toBe(IMAGE)

    await site.close()
  })

  it('donne la description des champs, pas une liste d’écrans', async () => {
    const site = await bench()
    const payload = await (await site.call('GET', '/api/panel')).json()
    const hero = payload.library.find((entry: any) => entry.name === 'hero')

    expect(hero.label).toBe('Bandeau principal')
    expect(hero.fields.map((field: any) => [field.name, field.kind])).toEqual([
      ['title', 'text'],
      ['subtitle', 'textarea'],
      ['image', 'image'],
      ['cta', 'group'],
    ])
    expect(hero.fields[0]).toMatchObject({
      i18n: true,
      required: true,
      max: 80,
    })

    await site.close()
  })

  it('compte l’avancement des langues en préparation', async () => {
    const site = await bench()
    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.pages[0].progress).toEqual([
      { language: 'en', filled: 0, total: 3 },
    ])

    await site.close()
  })

  it('refuse tout à qui n’a pas de session', async () => {
    const site = await bench()
    const response = await site.call('GET', '/api/panel', undefined, {
      cookie: false,
    })

    expect(response.status).toBe(401)

    await site.close()
  })

  it('ouvre une page cassée plutôt que de se dérober', async () => {
    const site = await bench({
      content: {
        $format: CONTENT_FORMAT,
        meta: { title: { fr: '' } },
        blocks: [{ id: 'h1', type: 'hero', hidden: {}, props: {} }],
      },
    })

    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.pages).toHaveLength(1)
    expect(
      payload.problems.some((issue: any) => issue.severity === 'error'),
    ).toBe(true)

    await site.close()
  })
})

describe('/api/publish', () => {
  it('lance la mise en ligne et rend l’état obtenu', async () => {
    const site = await bench()
    const body = await (await site.call('POST', '/api/publish', {})).json()

    expect(body.ok).toBe(true)
    expect(body.publication.running).toBe(true)

    await site.publisher.settled()

    const after = await (await site.call('GET', '/api/publish')).json()

    expect(after.publication.running).toBe(false)
    expect(after.publication.last.outcome).toBe('published')

    await site.close()
  })

  it('porte le dernier état dans la charge utile de démarrage', async () => {
    const site = await bench()

    const before = await (await site.call('GET', '/api/panel')).json()

    expect(before.publication).toEqual({ running: false, queued: false })

    site.publisher.request({ email: 'client@exemple.fr' })
    await site.publisher.settled()

    const after = await (await site.call('GET', '/api/panel')).json()

    expect(after.publication.last.message).toBe('Ton site est en ligne.')

    await site.close()
  })

  it('ne dit jamais la trace de l’erreur au client', async () => {
    const site = await bench({ build: buildsBadly('Error: EACCES /srv/site') })

    site.publisher.request({ email: 'client@exemple.fr' })
    await site.publisher.settled()

    const body = await (await site.call('GET', '/api/publish')).json()

    expect(JSON.stringify(body)).not.toContain('EACCES')
    expect(body.publication.last.message).toContain('n’a pas changé')

    await site.close()
  })

  it('refuse un corps qui n’est pas annoncé en JSON', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/publish',
      {},
      {
        json: false,
      },
    )

    expect(response.status).toBe(415)
    expect(site.publisher.state().running).toBe(false)

    await site.close()
  })

  it('refuse une requête sans origine', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/publish',
      {},
      {
        origin: null,
      },
    )

    expect(response.status).toBe(403)
    expect(site.publisher.state().running).toBe(false)

    await site.close()
  })

  it('refuse une méthode que l’adresse ne porte pas', async () => {
    const site = await bench()

    expect((await site.call('DELETE', '/api/publish')).status).toBe(405)

    await site.close()
  })
})

describe('PUT /api/pages/:nom', () => {
  it('écrit la page et rend son nouvel état', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks[0].props.title.fr = 'Bonsoir'

    const response = await site.call('PUT', '/api/pages/index', draft)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.page.blocks[0].props.title.fr).toBe('Bonsoir')

    const written = await site.page()

    expect((written as any).blocks[0].props.title.fr).toBe('Bonsoir')
    expect((written as any).$format).toBe(CONTENT_FORMAT)

    await site.close()
  })

  it('refuse un contenu invalide, et n’écrit rien', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks[0].props.title.fr = ''

    const response = await site.call('PUT', '/api/pages/index', draft)
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.problems.join(' ')).toContain('Titre')
    expect(body.problems.join(' ')).toContain('doit être rempli')

    expect(((await site.page()) as any).blocks[0].props.title.fr).toBe(
      'Bonjour',
    )

    await site.close()
  })

  it('refuse un texte plus long que sa borne', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks[0].props.title.fr = 'x'.repeat(81)

    const body = await (
      await site.call('PUT', '/api/pages/index', draft)
    ).json()

    expect(body.problems.join(' ')).toContain('dépasse 80 caractères')

    await site.close()
  })

  it('garde l’identifiant d’une section réordonnée', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks = [draft.blocks[1], draft.blocks[0]]

    await site.call('PUT', '/api/pages/index', draft)

    const written = (await site.page()) as any

    expect(written.blocks.map((block: any) => block.id)).toEqual(['r1', 'h1'])

    await site.close()
  })

  it('retient une section masquée par langue', async () => {
    const site = await bench()
    const draft = defaultPage() as any

    draft.blocks[0].hidden = { fr: true }

    await site.call('PUT', '/api/pages/index', draft)

    expect(((await site.page()) as any).blocks[0].hidden).toEqual({ fr: true })

    await site.close()
  })

  it('ne bloque pas sur une langue en préparation incomplète', async () => {
    const site = await bench()
    const response = await site.call('PUT', '/api/pages/index', defaultPage())

    expect(response.status).toBe(200)

    await site.close()
  })

  it('ignore une page qui n’existe pas', async () => {
    const site = await bench()
    const response = await site.call('PUT', '/api/pages/contact', defaultPage())

    expect(response.status).toBe(404)

    await site.close()
  })

  it('refuse un chemin de page sorti du dossier', async () => {
    const site = await bench()
    const response = await site.call(
      'PUT',
      '/api/pages/..%2f..%2fsite.config',
      defaultPage(),
    )

    expect(response.status).toBe(404)

    await site.close()
  })
})

describe('PUT /api/chrome', () => {
  const header = (label: string) => ({
    id: 'header',
    type: 'header',
    hidden: {},
    props: { links: [{ label: { fr: label, en: '' }, href: '/' }] },
  })

  const footer = {
    id: 'footer',
    type: 'footer',
    hidden: {},
    props: { links: [] },
  }

  it('écrit le chrome et rend son nouvel état', async () => {
    const site = await bench()

    const response = await site.call('PUT', '/api/chrome', {
      blocks: [header('Accueil'), footer],
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.chrome.sections.map((s: any) => s.id)).toEqual([
      'header',
      'footer',
    ])

    const written = await site.chrome()

    expect((written as any).header.links[0].label.fr).toBe('Accueil')
    expect((written as any).$format).toBe(CONTENT_FORMAT)

    await site.close()
  })

  // Le fichier n’existe pas tant que personne n’a rien rangé : le panel doit
  // quand même l’ouvrir, avec ses deux emplacements vides.
  it('ouvre les deux emplacements avant le premier enregistrement', async () => {
    const site = await bench()
    const body = await (await site.call('GET', '/api/panel')).json()

    expect(body.chrome.draft.sections.map((s: any) => s.id)).toEqual([
      'header',
      'footer',
    ])
    expect(body.chrome.types.map((t: any) => t.name)).toEqual([
      'header',
      'footer',
    ])
    expect(body.chrome.draft.sections[0].props).toEqual({})

    await site.close()
  })

  it('refuse un contenu invalide, et n’écrit rien', async () => {
    const site = await bench()

    const response = await site.call('PUT', '/api/chrome', {
      blocks: [header(''), footer],
    })

    expect(response.status).toBe(422)
    expect((await response.json()).problems.length).toBeGreaterThan(0)
    expect(await site.chrome()).toEqual({})

    await site.close()
  })

  it('refuse une méthode que l’adresse ne porte pas', async () => {
    const site = await bench()

    expect((await site.call('POST', '/api/chrome', {})).status).toBe(405)

    await site.close()
  })

  it('refuse une origine étrangère', async () => {
    const site = await bench()

    const response = await site.call(
      'PUT',
      '/api/chrome',
      { blocks: [] },
      { origin: 'https://ailleurs.test' },
    )

    expect(response.status).toBe(403)

    await site.close()
  })
})

describe('gardes', () => {
  it('refuse un corps qui ne s’annonce pas en JSON', async () => {
    const site = await bench()
    const response = await site.call('PUT', '/api/pages/index', defaultPage(), {
      json: false,
    })

    expect(response.status).toBe(415)

    await site.close()
  })

  it('refuse une origine étrangère', async () => {
    const site = await bench()
    const response = await site.call('PUT', '/api/pages/index', defaultPage(), {
      origin: 'https://ailleurs.test',
    })

    expect(response.status).toBe(403)

    await site.close()
  })

  it('refuse une requête sans origine', async () => {
    const site = await bench()
    const response = await site.call('PUT', '/api/pages/index', defaultPage(), {
      origin: null,
    })

    expect(response.status).toBe(403)

    await site.close()
  })

  it('refuse une méthode que l’adresse ne porte pas', async () => {
    const site = await bench()

    expect((await site.call('POST', '/api/panel', {})).status).toBe(405)
    expect((await site.call('GET', '/api/pages/index')).status).toBe(405)

    await site.close()
  })

  it('refuse une mise en ligne à qui n’est pas connecté', async () => {
    const site = await bench()

    const response = await site.call(
      'POST',
      '/api/publish',
      {},
      {
        cookie: false,
      },
    )

    expect(response.status).toBe(401)
    expect(site.publisher.state().running).toBe(false)

    await site.close()
  })

  it('laisse passer ce qui ne lui appartient pas', async () => {
    const site = await bench()
    const response = await site.call('GET', '/ailleurs')

    expect(await response.text()).toBe('hors panel')

    await site.close()
  })
})

describe('la capacité « analytics »', () => {
  it('refuse le rapport d’audience quand elle est éteinte', async () => {
    const site = await bench({ capabilities: { analytics: false } })
    const response = await site.call('GET', '/api/stats')

    expect(response.status).toBe(409)

    const payload = await (await site.call('GET', '/api/panel')).json()

    expect(payload.site.capabilities.analytics).toBe(false)

    await site.close()
  })
})
