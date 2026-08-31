// Ce qu’un nom de fichier de `content/` donne : sa route, et son nom devant le
// client. Les deux se déduisent du seul nom, sans ouvrir le fichier.
//
// Le module ne touche à rien — ni disque, ni schéma. C’est ce qui lui permet
// d’être lu à la fois par le rendu du site, par le panel qui vit dans un
// navigateur, et par le chrome qui nomme les pages de son menu : une page
// s’appelle pareil partout.

const HOME = 'index'

export function routeOf(name: string): string {
  return name === HOME ? '/' : `/${name}`
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
