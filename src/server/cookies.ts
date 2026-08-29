// Les trois cookies du panel, et rien d’autre : aucun n’est lisible par du
// JavaScript, aucun ne part vers un autre site, aucun ne voyage en clair.
//
// `SameSite=Strict` a un effet visible : arriver sur le panel depuis un lien
// externe montre l’écran de connexion, puis la session revient à la navigation
// suivante. C’est le prix de la protection, et il est payé sciemment.

export const COOKIES = {
  session: 'basalte_session',
  attempt: 'basalte_attempt',
  device: 'basalte_device',
} as const

export const COOKIE_PATH = '/'

export type CookieOptions = {
  /** Durée de vie en secondes. */
  readonly maxAge: number
}

export function readCookie(
  header: string | null,
  name: string,
): string | undefined {
  if (header === null) return undefined

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=')

    if (separator === -1) continue
    if (pair.slice(0, separator).trim() !== name) continue

    return decodeURIComponent(pair.slice(separator + 1).trim())
  }

  return undefined
}

export function setCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${COOKIE_PATH}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}

export function clearCookie(name: string): string {
  return setCookie(name, '', { maxAge: 0 })
}
