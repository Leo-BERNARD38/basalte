// Les documents, servis depuis le dépôt avant que la version ne soit publiée
// — comme les images le sont par `media.ts`, et pour la même raison : le panel
// montre ce qui vient d’être déposé.
//
// Un document n’est jamais rendu dans une page : la réponse l’annonce en pièce
// jointe et interdit toute reniflée de type. En production, le Caddyfile
// généré pose les mêmes en-têtes sur le fichier servi depuis le disque.
//
// Seuls les noms produits par le téléversement sont servis : empreinte, puis
// « .pdf ». Aucun autre chemin ne peut donc être demandé.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { APIRoute } from 'astro'

import { DOCUMENT_DIR } from '../media/documents.js'
import { DOCUMENT_TYPE, isDocumentFile } from '../media/resolve.js'
import { panelContext } from './server.js'

export const prerender = false

const MISSING = new Response('Document inconnu.', {
  status: 404,
  headers: { 'content-type': 'text/plain; charset=utf-8' },
})

export const GET: APIRoute = async ({ params }) => {
  const name = params['file'] ?? ''

  if (!isDocumentFile(name)) return MISSING.clone()

  try {
    const file = await readFile(
      path.join(panelContext().root, DOCUMENT_DIR, name),
    )

    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': DOCUMENT_TYPE,
        'content-disposition': `attachment; filename="${name}"`,
        'x-content-type-options': 'nosniff',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return MISSING.clone()
  }
}
