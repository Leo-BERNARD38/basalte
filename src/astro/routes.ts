// Les URL d’un site multilingue : racine pour la langue par défaut, préfixe de
// code de langue pour les autres. Une langue en préparation n’a pas d’URL, elle
// n’est pas construite.

export function slugFor(route: string, language: string): string | undefined {
  const path = route === '/' ? '' : route.slice(1)
  const slug =
    language === '' ? path : `${language}${path === '' ? '' : `/${path}`}`

  return slug === '' ? undefined : slug
}

export function urlFor(route: string, language: string): string {
  const slug = slugFor(route, language)

  return slug === undefined ? '/' : `/${slug}`
}
