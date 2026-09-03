// Ce que le panel dit d’une page devant le client : son nom, et l’ordre dans
// lequel les pages se présentent.
//
// Le serveur rend un titre par page — celui des moteurs de recherche, dans la
// langue par défaut. Le panel l’affichait nulle part : le titre de l’écran et
// le menu des pages employaient le nom du fichier, mis en forme, si bien que
// « Actualités » se lisait « Actualites » partout dans l’outil.

import {
  inNavigationOrder,
  pageHeading,
  pageLabel,
  routeOf,
} from '../content/naming.js'
import type { DraftPage } from '../server/pages.js'

/**
 * Le nom d’une page : son titre sans le nom du site, sinon son nom de
 * fichier. L’accueil reste « Accueil » : son titre est la promesse du site —
 * « Basalte — votre site, que vous modifiez vous-même » —, et c’est le mot
 * « Accueil » que le client cherche dans une liste.
 */
export function pageTitle(
  page: Pick<DraftPage, 'name' | 'title'>,
  site: string,
): string {
  if (routeOf(page.name) === '/') return pageLabel(page.name)

  return pageHeading(page.title, site) || pageLabel(page.name)
}

/** Les pages dans l’ordre où le client les cherche : l’accueil en tête. */
export function orderedPages<T extends { readonly name: string }>(
  pages: readonly T[],
): readonly T[] {
  return inNavigationOrder(pages)
}
