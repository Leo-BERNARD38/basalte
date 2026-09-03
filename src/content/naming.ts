// Ce qu’un nom de fichier de `content/` donne : sa route, et son nom devant le
// client. Les deux se déduisent du seul nom, sans ouvrir le fichier.
//
// Le module ne touche à rien — ni disque, ni schéma. C’est ce qui lui permet
// d’être lu à la fois par le rendu du site, par le panel qui vit dans un
// navigateur, et par le chrome qui nomme les pages de son menu : une page
// s’appelle pareil partout.

const HOME = 'index'

/**
 * La page où mène un envoi de formulaire réussi. Elle donne à la conversion une
 * adresse à elle — mesurable, partageable, et assez grande pour dire autre
 * chose que « merci ». Le nom vit ici parce que trois côtés le lisent : le
 * serveur qui redirige, le rendu qui la range, et le chrome qui l’écarte.
 */
export const THANKS_PAGE = 'merci'

// Une page de service existe pour un visiteur qui vient d’agir, pas pour
// quelqu’un qui cherche le site : elle n’a rien à faire dans un menu, dans un
// sitemap, ni dans un index. L’écarter aux trois endroits par trois conditions
// écrites à la main est exactement ce que D110 reproche — d’où ce prédicat, lu
// par les trois.
const SERVICE = new Set([THANKS_PAGE])

export function routeOf(name: string): string {
  return name === HOME ? '/' : `/${name}`
}

/** Vrai pour une route que le site sert sans vouloir qu’on l’y trouve. */
export function isServiceRoute(route: string): boolean {
  return [...SERVICE].some((name) => routeOf(name) === route)
}

/**
 * Le nom d’une page devant le client. Le titre des moteurs de recherche est
 * une phrase, pas une étiquette : il reste dans son champ, et la navigation
 * emploie le nom du fichier, mis en forme.
 */
export function pageLabel(name: string): string {
  if (name === HOME) return 'Accueil'

  const words = name.replace(/[-_]/g, ' ')

  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Le titre d’une page tel que le panel le lit : le titre des moteurs de
 * recherche, délesté du nom du site qui le termine. « Actualités — Basalte »
 * se lit « Actualités » dans une liste de pages du site Basalte, où le nom du
 * site se répéterait à chaque ligne. Un titre vide, ou réduit au nom du site,
 * revient tel quel : c’est à l’appelant de lui trouver un nom de repli.
 */
export function pageHeading(title: string, site: string): string {
  const plain = title.trim()
  const name = site.trim()

  if (name === '') return plain

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = plain
    .replace(new RegExp(`\\s*[—–|·-]\\s*${escaped}\\s*$`, 'iu'), '')
    .trim()

  return stripped === '' ? plain : stripped
}

/**
 * L’ordre d’une liste de pages devant le client : l’accueil d’abord, les pages
 * de service en dernier, et entre les deux l’ordre reçu. Le disque les range
 * par nom de fichier, ce qui plaçait l’accueil en quatrième position, sous son
 * nom de fichier.
 */
export function inNavigationOrder<T extends { readonly name: string }>(
  pages: readonly T[],
): readonly T[] {
  const rank = (name: string): number =>
    name === HOME ? 0 : SERVICE.has(name) ? 2 : 1

  return pages.toSorted((left, right) => rank(left.name) - rank(right.name))
}
