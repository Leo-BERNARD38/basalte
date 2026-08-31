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
