// Toutes les adresses du panel passent par ici. Astro ne fait que porter la
// requête : le flux vit dans `src/server/`, en fonctions `Request` vers
// `Response` que les tests appellent sans serveur (D51).
//
// L’ordre compte : le formulaire de contact passe avant le panel, qui refuse
// tout ce qui n’a pas de session. C’est la seule adresse ouverte à un visiteur.

import type { APIRoute } from 'astro'

import { handleContact } from '../server/contact.js'
import { handleAuth } from '../server/handlers.js'
import { json } from '../server/http.js'
import { handlePanel } from '../server/panel.js'
import { panelContext } from './server.js'

export const prerender = false

export const ALL: APIRoute = async ({ request }) => {
  const panel = panelContext()

  return (
    (await handleAuth(panel.server, request)) ??
    (await handleContact(panel, request)) ??
    (await handlePanel(panel, request)) ??
    json({ ok: false, message: 'Adresse inconnue.' }, 404)
  )
}
