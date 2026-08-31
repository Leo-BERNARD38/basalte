// Le sitemap et le `robots.txt`, produits au build depuis les pages du dépôt.
//
// Seules les langues en ligne y figurent : une langue en préparation n’est pas
// construite, elle n’a donc pas d’adresse à donner. Une page dont toutes les
// sections sont masquées dans une langue n’y figure pas non plus — elle
// s’afficherait vide, et une page vide indexée vaut moins que rien.
//
// Une page de service — celle qui remercie après un envoi — n’y figure pas non
// plus : elle n’a de sens que pour qui vient d’agir, et un moteur qui l’indexe
// enverrait des visiteurs sur un remerciement qu’ils n’ont pas mérité.
//
// Le préfixe du rendu bureau n’apparaît jamais ici : il ne sort pas du disque,
// les deux rendus partagent une seule adresse publique (D103).

import { urlFor } from '../astro/routes.js'
import { isServiceRoute } from '../content/naming.js'
import type { Page } from '../content/page.js'
import type { Site } from '../site/define.js'

export const SITEMAP_FILE = 'sitemap.xml'
export const ROBOTS_FILE = 'robots.txt'

export type SitemapPage = {
  readonly route: string
  readonly page: Page
}

/** Une page a une adresse dans une langue tant qu’une section s’y montre. */
export function visibleIn(page: Page, language: string): boolean {
  return page.blocks.some((section) => section.hidden[language] !== true)
}

export function sitemapXml(site: Site, pages: readonly SitemapPage[]): string {
  const origin = `https://${site.domain}`
  const online = site.languages.online

  const prefix = (code: string) =>
    code === site.languages.default.code ? '' : code

  const entries: string[] = []

  for (const entry of pages) {
    if (isServiceRoute(entry.route)) continue

    const shown = online.filter((language) =>
      visibleIn(entry.page, language.code),
    )

    for (const language of shown) {
      const alternates =
        shown.length > 1
          ? shown.map(
              (other) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(other.code)}" href="${escapeXml(origin + urlFor(entry.route, prefix(other.code)))}" />`,
            )
          : []

      entries.push(
        [
          '  <url>',
          `    <loc>${escapeXml(origin + urlFor(entry.route, prefix(language.code)))}</loc>`,
          ...alternates,
          '  </url>',
        ].join('\n'),
      )
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

/**
 * Le panel et son API sont écartés : ils sont derrière une authentification et
 * n’ont rien à faire dans un index. Le reste est ouvert — un site public l’est.
 */
export function robotsTxt(site: Site): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: https://${site.domain}/${SITEMAP_FILE}`,
    '',
  ].join('\n')
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
