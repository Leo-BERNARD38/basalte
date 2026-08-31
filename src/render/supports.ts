// Les deux supports d’un site, et la règle qui décide lequel un visiteur
// reçoit.
//
// Un seul HTML plié par des media queries donne un mobile qui est un bureau
// compressé, et un bureau qui est un mobile étiré. Deux rendus séparés laissent
// dessiner deux mises en page, depuis le même contenu et à la même adresse.
//
// Le rendu mobile est la référence : c’est le composant d’un bloc, celui qui
// existe toujours. Le bureau est une variante, et il ne fait que présenter
// autrement — Google indexe au robot smartphone, si bien qu’un texte présent au
// seul bureau n’est jamais indexé (`src/render/parity.ts` le vérifie).
//
// Les pages du bureau sont rangées sous un préfixe, à côté des fichiers du site
// (`_astro/`) et de ceux du panel (`_panel/`, D85). Elles portent les URL
// publiques dans leur `canonical` et leurs `hreflang` : le préfixe ne sort
// jamais du disque, c’est le proxy qui y achemine.

import type { Site } from '../site/define.js'

export const SUPPORTS = ['mobile', 'desktop'] as const

export type Support = (typeof SUPPORTS)[number]

export const DEFAULT_SUPPORT: Support = 'mobile'

/** Le dossier des pages du bureau, sous la racine du site construit. */
export const DESKTOP_PREFIX = '_desktop'

/** Le suffixe qui fait d’un composant de bloc sa variante bureau. */
export const DESKTOP_SUFFIX = '.desktop.astro'

/**
 * Le paramètre par lequel un rendu se demande à l’aperçu du panel.
 *
 * Il vit ici, dans un module pur, et non à côté de la route qui le lit : le
 * panel s’exécute dans un navigateur, et importer une seule constante depuis un
 * module de `src/server/` y entraînerait tout le serveur (`src/admin/island.test.ts`).
 */
export const SUPPORT_PARAM = 'support'

/** L’indication client qui tranche, et la valeur qui dit « mobile ». */
export const MOBILE_HINT = 'Sec-CH-UA-Mobile'
export const MOBILE_HINT_TRUE = '?1'
export const MOBILE_HINT_FALSE = '?0'

/**
 * Les jetons de User-Agent qui restent, à défaut d’indication. Le Caddyfile
 * généré reprend cette source : la règle n’a qu’un endroit où s’écrire.
 */
export const MOBILE_USER_AGENT = /Mobi|Android/

/** Les supports qu’un site construit : le mobile seul, ou les deux. */
export function supportsOf(site: Site): readonly Support[] {
  return site.capabilities.desktopRender ? SUPPORTS : [DEFAULT_SUPPORT]
}

export function isSupport(value: string): value is Support {
  return (SUPPORTS as readonly string[]).includes(value)
}

/**
 * Le slug d’une page dans un support donné. Celui du mobile est le slug
 * public ; celui du bureau le porte sous le préfixe, racine comprise —
 * `undefined` y devient le préfixe seul.
 */
export function slugIn(
  support: Support,
  slug: string | undefined,
): string | undefined {
  if (support === DEFAULT_SUPPORT) return slug

  return slug === undefined ? DESKTOP_PREFIX : `${DESKTOP_PREFIX}/${slug}`
}

/** Le nom de la page d’erreur, sous chacun des deux préfixes. */
export const NOT_FOUND = '404'

/** Sa route dans un support donné, telle qu’elle est injectée. */
export function notFoundRoute(support: Support): string {
  return `/${slugIn(support, NOT_FOUND) ?? NOT_FOUND}`
}

/**
 * Le fichier qu’Astro en écrit, et que le proxy va chercher. Le mobile tombe
 * sur le cas particulier d’Astro — la route `/404` sort en `404.html`, à plat —
 * là où celle du bureau, préfixée, suit la règle des dossiers.
 */
export function notFoundFile(support: Support): string {
  return support === DEFAULT_SUPPORT
    ? `/${NOT_FOUND}.html`
    : `/${DESKTOP_PREFIX}/${NOT_FOUND}/index.html`
}

/**
 * Le support d’une page construite, lu sur son adresse. La page 404 est la
 * seule que le socle rend hors du parcours des pages : elle est injectée deux
 * fois, une par support, et c’est son chemin qui dit laquelle est laquelle.
 */
export function supportOfPath(pathname: string): Support {
  return pathname.startsWith(`/${DESKTOP_PREFIX}/`) ||
    pathname === `/${DESKTOP_PREFIX}`
    ? 'desktop'
    : DEFAULT_SUPPORT
}

/**
 * Le support d’une requête, et la règle de référence du socle.
 *
 * `Sec-CH-UA-Mobile` est une indication client à faible entropie : les
 * navigateurs Chromium l’envoient d’eux-mêmes, dès la première requête et sans
 * `Accept-CH`. Quand elle est là, elle tranche. Les autres navigateurs ne
 * l’envoient pas, et il ne reste que le User-Agent, où seul le jeton `Mobi` est
 * stable — `Android` le complète pour les navigateurs qui l’omettent.
 *
 * Tout ce qui ne se déclare pas mobile reçoit le bureau : une tablette, un
 * robot à User-Agent d’ordinateur, un client qui n’envoie rien. Le robot
 * smartphone de Google, lui, porte `Mobi` et tombe du bon côté sans cas
 * particulier.
 *
 * Le Caddyfile généré (`src/client/docker.ts`) transcrit cette règle : c’est
 * lui qui l’applique en production, celle-ci sert au développement et à
 * l’aperçu.
 */
export function supportFor(headers: Headers): Support {
  const hint = headers.get(MOBILE_HINT)

  if (hint !== null) {
    return hint.trim() === MOBILE_HINT_TRUE ? 'mobile' : 'desktop'
  }

  return MOBILE_USER_AGENT.test(headers.get('user-agent') ?? '')
    ? 'mobile'
    : 'desktop'
}
