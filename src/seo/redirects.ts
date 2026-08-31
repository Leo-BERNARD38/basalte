// Les redirections d’un site : ce qu’on oublie à chaque refonte.
//
// Un client qui refait son site a des adresses qui existaient — indexées,
// imprimées, mises en favori. Sans redirection, le référencement acquis se perd
// sans que rien ne le signale.
//
// Elles sont déclarées dans `site.config.ts` et rendues en pages statiques par
// le build, jamais par le `Caddyfile` : celui-ci est écrit à l’`init` et n’est
// jamais régénéré (D106), si bien qu’une redirection ajoutée après coup
// n’atteindrait jamais la machine. Une page de redirection instantanée est lue
// par Google comme une redirection permanente, et elle repart à chaque mise en
// ligne sans qu’on touche au serveur.

export type Redirects = Readonly<Record<string, string>>

const EXTERNAL = /^https?:\/\//

/**
 * Refusé au chargement de la configuration, là où l’erreur nomme encore la
 * ligne fautive. Une redirection cassée découverte au build serait découverte
 * pendant une mise en ligne.
 */
export function checkRedirects(redirects: Redirects): void {
  for (const [from, to] of Object.entries(redirects)) {
    if (!from.startsWith('/')) {
      throw new Error(
        `« ${from} » n’est pas une adresse à rediriger : elle commence par une barre, comme « /ancienne-page ».`,
      )
    }

    if (!to.startsWith('/') && !EXTERNAL.test(to)) {
      throw new Error(
        `« ${from} » redirige vers « ${to} », qui n’est ni un chemin du site ni une adresse complète.`,
      )
    }

    if (from === to) {
      throw new Error(`« ${from} » se redirige vers elle-même.`)
    }

    const next = redirects[to]

    if (next !== undefined) {
      throw new Error(
        `« ${from} » redirige vers « ${to} », qui redirige à son tour : enchaîner deux redirections coûte un aller-retour de plus, écris « ${from} » vers « ${next} ».`,
      )
    }
  }
}

/**
 * Une redirection qui part d’une page existante n’est jamais suivie : le
 * fichier de la page l’emporte sur celui de la redirection. Le dire est le seul
 * moyen de ne pas la croire en place.
 */
export function shadowedRedirects(
  redirects: Redirects,
  routes: readonly string[],
): readonly string[] {
  return Object.keys(redirects).filter((from) => routes.includes(from))
}

/**
 * Une cible interne qui ne mène nulle part. Le contrôle s’arrête aux adresses
 * du site : ce qui part ailleurs ne se vérifie pas d’ici.
 */
export function danglingRedirects(
  redirects: Redirects,
  routes: readonly string[],
): readonly string[] {
  return Object.entries(redirects)
    .filter(([, to]) => to.startsWith('/') && !routes.includes(to))
    .map(([from]) => from)
}
