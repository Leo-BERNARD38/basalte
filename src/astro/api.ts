// Toutes les adresses du panel passent par ici. Astro ne fait que porter la
// requête : le flux vit dans `src/server/`, en fonctions `Request` vers
// `Response` que les tests appellent sans serveur (D51).

import type { APIRoute } from 'astro'

import { handleAuth } from '../server/handlers.js'
import { json } from '../server/http.js'
import { handlePanel } from '../server/panel.js'
import { panelContext } from './server.js'

export const prerender = false

export const ALL: APIRoute = async ({ request }) => {
  const panel = panelContext()

  return (
    (await handleAuth(panel.server, request)) ??
    (await handlePanel(panel, request)) ??
    json({ ok: false, message: 'Adresse inconnue.' }, 404)
  )
}
