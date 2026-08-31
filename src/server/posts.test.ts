// Les trois gestes du journal, joués sur le dépôt jetable : écrire un billet,
// l’enregistrer, le supprimer. Ce sont les deux premiers et le dernier qui
// n’existaient pas — une page ne se crée ni ne se détruit depuis le panel.

import { afterEach, describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import { bench, IMAGE, type Bench } from './panel.fixture.js'

let open: Bench | undefined

afterEach(async () => {
  await open?.close()
  open = undefined
})

const JOURNAL = { base: 'actualites', label: 'Actualités' }

function post(overrides: Record<string, unknown> = {}) {
  return {
    $format: CONTENT_FORMAT,
    hidden: { fr: false },
    fields: {
      title: { fr: 'L’atelier ouvre', en: '' },
      date: '2026-08-28',
      excerpt: { fr: 'Six mois de travaux.', en: '' },
      cover: IMAGE,
      body: { fr: 'Le texte du billet.', en: '' },
      gallery: [],
      ...(overrides['fields'] as Record<string, unknown> | undefined),
    },
  }
}

async function journalBench(
  posts: Record<string, unknown> = {},
): Promise<Bench> {
  const created = await bench({ journal: JOURNAL, posts })

  open = created

  return created
}

describe('la charge utile', () => {
  it('ne porte pas de journal sur un site qui n’en déclare pas', async () => {
    open = await bench()

    const answer = await open.call('GET', '/api/panel')
    const body = (await answer.json()) as { journal?: unknown }

    expect(body.journal).toBeUndefined()
  })

  it('porte les billets, du plus récent au plus ancien', async () => {
    const app = await journalBench({
      vieux: post({ fields: { date: '2020-01-01' } }),
      neuf: post({ fields: { date: '2026-12-31' } }),
    })

    const answer = await app.call('GET', '/api/panel')
    const body = (await answer.json()) as {
      journal: { label: string; posts: { slug: string }[] }
    }

    expect(body.journal.label).toBe('Actualités')
    expect(body.journal.posts.map((entry) => entry.slug)).toEqual([
      'neuf',
      'vieux',
    ])
  })
})

describe('créer un billet', () => {
  it('tire le slug du titre, et le rend masqué', async () => {
    const app = await journalBench()

    const answer = await app.call('POST', '/api/posts', {
      title: 'L’atelier ouvre ses portes',
      date: '2026-08-28',
    })

    expect(answer.status).toBe(200)

    const body = (await answer.json()) as {
      post: { slug: string; route: string; hidden: Record<string, boolean> }
    }

    expect(body.post.slug).toBe('latelier-ouvre-ses-portes')
    expect(body.post.route).toBe('/actualites/latelier-ouvre-ses-portes')
    expect(body.post.hidden['fr']).toBe(true)

    expect(await app.post('latelier-ouvre-ses-portes')).toBeDefined()
  })

  it('n’écrase pas un billet de même titre : il en suffixe l’adresse', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('POST', '/api/posts', {
      title: 'Ouverture',
      date: '2026-08-28',
    })

    const body = (await answer.json()) as { post: { slug: string } }

    expect(body.post.slug).toBe('ouverture-2')
    expect(await app.post('ouverture')).toBeDefined()
  })

  it('refuse un titre qui ne ferait aucune adresse', async () => {
    const app = await journalBench()

    const answer = await app.call('POST', '/api/posts', {
      title: '!!! ???',
      date: '2026-08-28',
    })

    expect(answer.status).toBe(422)
  })

  it('refuse quand le site n’a pas de journal', async () => {
    open = await bench()

    const answer = await open.call('POST', '/api/posts', {
      title: 'Un billet',
      date: '2026-08-28',
    })

    expect(answer.status).toBe(409)
  })
})

describe('enregistrer un billet', () => {
  it('écrit ce que la validation a produit', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('PUT', '/api/posts/ouverture', {
      hidden: { fr: false },
      fields: {
        title: { fr: 'Un autre titre', en: '' },
        date: '2026-09-01',
        excerpt: { fr: 'Un autre résumé.', en: '' },
        cover: '',
        body: { fr: 'Un autre texte.', en: '' },
        gallery: [],
      },
    })

    expect(answer.status).toBe(200)

    const written = (await app.post('ouverture')) as {
      fields: { date: string; title: Record<string, string> }
    }

    expect(written.fields.date).toBe('2026-09-01')
    expect(written.fields.title['fr']).toBe('Un autre titre')
  })

  it('refuse une date qui n’existe pas, avec la phrase du client', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('PUT', '/api/posts/ouverture', {
      hidden: {},
      fields: { ...post().fields, date: '2026-02-31' },
    })

    expect(answer.status).toBe(422)

    const body = (await answer.json()) as { problems: string[] }

    expect(body.problems.join(' ')).toContain('AAAA-MM-JJ')
  })

  it('refuse un billet sans titre', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('PUT', '/api/posts/ouverture', {
      hidden: {},
      fields: { ...post().fields, title: { fr: '', en: '' } },
    })

    expect(answer.status).toBe(422)
  })

  it('ne connaît pas un billet qui n’existe pas', async () => {
    const app = await journalBench()

    const answer = await app.call('PUT', '/api/posts/absent', {
      hidden: {},
      fields: post().fields,
    })

    expect(answer.status).toBe(404)
  })
})

describe('supprimer un billet', () => {
  it('efface le fichier', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('DELETE', '/api/posts/ouverture')

    expect(answer.status).toBe(200)
    expect(await app.post('ouverture')).toBeUndefined()
  })

  it('refuse une suppression venue d’ailleurs', async () => {
    const app = await journalBench({ ouverture: post() })

    const answer = await app.call('DELETE', '/api/posts/ouverture', undefined, {
      origin: null,
    })

    expect(answer.status).toBe(403)
    expect(await app.post('ouverture')).toBeDefined()
  })

  it('ne supprime pas un billet qui n’existe pas', async () => {
    const app = await journalBench()

    expect((await app.call('DELETE', '/api/posts/absent')).status).toBe(404)
  })
})

describe('les méthodes', () => {
  it('refuse une lecture directe d’un billet', async () => {
    const app = await journalBench({ ouverture: post() })

    expect((await app.call('GET', '/api/posts/ouverture')).status).toBe(405)
  })
})
