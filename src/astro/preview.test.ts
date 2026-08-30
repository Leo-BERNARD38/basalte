import { describe, expect, it } from 'vitest'

import { CONTENT_FORMAT } from '../content/page.js'
import { bench, ORIGIN } from '../server/panel.fixture.js'
import { PANEL_PATH } from '../server/handlers.js'
import { resolvePreview } from './preview.js'

function visit(cookie?: string, query = ''): Request {
  return new Request(`${ORIGIN}/admin/preview/${query}`, {
    headers: cookie === undefined ? {} : { cookie },
  })
}

describe('resolvePreview', () => {
  it('renvoie vers le panel qui n’est pas connecté', async () => {
    const site = await bench()
    const view = await resolvePreview(site.panel, visit(), '')

    expect(view.kind).toBe('stop')

    if (view.kind === 'stop') {
      expect(view.response.status).toBe(303)
      expect(view.response.headers.get('location')).toBe(PANEL_PATH)
    }

    await site.close()
  })

  it('rend la page dans la langue par défaut', async () => {
    const site = await bench()
    const view = await resolvePreview(site.panel, visit(site.cookie), '')

    expect(view.kind).toBe('page')

    if (view.kind === 'page') {
      expect(view.language).toBe('fr')
      expect(view.entry.route).toBe('/')
    }

    await site.close()
  })

  it('rend aussi une langue en préparation, absente du site construit', async () => {
    const site = await bench()
    const view = await resolvePreview(site.panel, visit(site.cookie), 'en')

    expect(view.kind).toBe('page')

    if (view.kind === 'page') expect(view.language).toBe('en')

    await site.close()
  })

  it('dit ce qui cloche quand la page ne passe pas la validation', async () => {
    const site = await bench({
      content: {
        $format: CONTENT_FORMAT,
        meta: { title: { fr: '' } },
        blocks: [],
      },
    })

    const view = await resolvePreview(site.panel, visit(site.cookie), '')

    expect(view.kind).toBe('stop')

    if (view.kind === 'stop') {
      expect(view.response.status).toBe(404)
      expect(await view.response.text()).toContain('ne passe pas la validation')
    }

    await site.close()
  })

  it('ne connaît pas une adresse qu’aucune page ne sert', async () => {
    const site = await bench()
    const view = await resolvePreview(
      site.panel,
      visit(site.cookie),
      'ailleurs',
    )

    expect(view.kind).toBe('stop')

    if (view.kind === 'stop') {
      expect(await view.response.text()).toContain('Aucune page')
    }

    await site.close()
  })

  it('rend le mobile quand la bascule ne demande rien', async () => {
    const site = await bench({ capabilities: { desktopRender: true } })
    const view = await resolvePreview(site.panel, visit(site.cookie), '')

    expect(view.kind).toBe('page')

    if (view.kind === 'page') expect(view.support).toBe('mobile')

    await site.close()
  })

  it('rend le bureau quand la bascule le demande', async () => {
    const site = await bench({ capabilities: { desktopRender: true } })
    const view = await resolvePreview(
      site.panel,
      visit(site.cookie, '?support=desktop'),
      '',
    )

    expect(view.kind).toBe('page')

    if (view.kind === 'page') expect(view.support).toBe('desktop')

    await site.close()
  })

  it('ne montre pas un rendu que la mise en ligne ne produirait pas', async () => {
    const site = await bench()
    const view = await resolvePreview(
      site.panel,
      visit(site.cookie, '?support=desktop'),
      '',
    )

    expect(view.kind).toBe('page')

    if (view.kind === 'page') expect(view.support).toBe('mobile')

    await site.close()
  })

  it('retombe sur le mobile devant un support inconnu', async () => {
    const site = await bench({ capabilities: { desktopRender: true } })
    const view = await resolvePreview(
      site.panel,
      visit(site.cookie, '?support=montre'),
      '',
    )

    expect(view.kind).toBe('page')

    if (view.kind === 'page') expect(view.support).toBe('mobile')

    await site.close()
  })
})
