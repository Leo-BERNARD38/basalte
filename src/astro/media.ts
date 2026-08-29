// Les images, servies depuis le dépôt et non depuis la version construite.
//
// Le panel montre ce qui est en train d’être écrit : une image téléversée doit
// s’afficher immédiatement, alors que la mise en ligne, elle, n’a pas encore
// eu lieu. Le site public, lui, ne passe jamais par ici — il sert `public/`
// tel quel.
//
// Seuls les noms produits par l’ingestion sont servis : empreinte, largeur,
// WebP. Aucun autre chemin ne peut donc être demandé.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { APIRoute } from 'astro'

import { isDerivative, MEDIA_DIR } from '../media/ingest.js'
import { panelContext } from './server.js'

export const prerender = false

const MISSING = new Response('Image inconnue.', {
  status: 404,
  headers: { 'content-type': 'text/plain; charset=utf-8' },
})

export const GET: APIRoute = async ({ params }) => {
  const name = params['file'] ?? ''

  if (!isDerivative(name)) return MISSING.clone()

  try {
    const file = await readFile(path.join(panelContext().root, MEDIA_DIR, name))

    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': 'image/webp',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return MISSING.clone()
  }
}
