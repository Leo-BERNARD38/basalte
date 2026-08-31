// Ce qu’une date vaut, et ce qu’elle donne à lire. Un module pur : le rendu du
// site, la validation et le panel le lisent tous les trois, et le panel vit
// dans un navigateur.
//
// Une date civile s’écrit « AAAA-MM-JJ », sans heure ni fuseau. C’est la seule
// forme qui ne dépend pas de l’endroit d’où on la lit : `new Date('2026-08-31')`
// désigne le même jour à Grenoble et à Tokyo, là où une date avec heure change
// de quantième selon le fuseau du serveur qui construit le site.
//
// La forme est aussi celle qui se trie comme du texte, ce dont le journal se
// sert pour ordonner ses billets sans construire un seul objet `Date`.

const PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Vrai pour une date réellement au calendrier. Le motif seul laisserait passer
 * un 31 février : la vérification refait le trajet et compare, faute de quoi
 * `Date` ramène silencieusement au 3 mars.
 */
export function isDate(value: string): boolean {
  if (!PATTERN.test(value)) return false

  const time = Date.parse(`${value}T00:00:00Z`)

  if (Number.isNaN(time)) return false

  return new Date(time).toISOString().slice(0, 10) === value
}

/** Le jour d’aujourd’hui, dans la même forme. */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** L’année d’une date, telle que l’index du journal groupe ses billets. */
export function yearOf(value: string): string {
  return value.slice(0, 4)
}

/**
 * La date telle qu’une page l’affiche. Le fuseau est forcé à UTC : sans lui,
 * une machine à l’ouest de Greenwich construirait le site en affichant la
 * veille.
 */
export function formatDate(value: string, language: string): string {
  if (!isDate(value)) return value

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
