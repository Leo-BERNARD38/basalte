// Ce qui ouvre le panel à la première requête, quelle qu’elle soit.
//
// Le contexte ne s’ouvre qu’à la demande, et seules quelques routes en avaient
// besoin : une machine qui vient de démarrer pouvait donc servir sa page
// d’édition sans jamais lancer la purge ni la publication au démarrage. Ce
// passage obligé enlève la question.

import type { MiddlewareHandler } from 'astro'

import { panelContext } from './server.js'

export const onRequest: MiddlewareHandler = (_context, next) => {
  panelContext()

  return next()
}
