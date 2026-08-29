// Le lien produit par `basalte admin:login`. Il vit hors de `/api/` parce
// qu’il s’ouvre dans un navigateur, pas dans un `fetch`.

import type { APIRoute } from 'astro'

import { handleAuth } from '../server/handlers.js'
import { panelContext } from './server.js'

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  const panel = panelContext()

  return (
    (await handleAuth(panel.server, request)) ??
    new Response('Adresse inconnue.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  )
}
