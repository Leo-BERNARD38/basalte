// Le flux du journal. C’est ce qui sépare un vrai journal d’une liste de
// pages : un agrégateur s’y abonne, une veille le suit, et un tiers peut le
// reprendre sans lire le site.
//
// Un flux par langue en ligne, comme le sitemap porte une adresse par langue :
// un lecteur français n’a rien à faire des billets anglais, et un flux qui
// mélangerait les deux les lui donnerait quand même.
//
// L’échappement est celui du sitemap, et pour la même raison : un contenu
// porte du texte que le client écrit, et `&` y est un caractère comme un autre.

import { urlFor } from '../astro/routes.js'
import { escapeXml } from '../seo/sitemap.js'
import type { Languages } from '../site/languages.js'
import type { Site } from '../site/define.js'
import type { Journal } from './define.js'
import type { PostEntry } from './page.js'

/**
 * L’adresse du flux d’une langue. La langue par défaut garde le nom nu, les
 * autres portent leur code : c’est la règle des pages, et elle évite qu’un
 * abonné se retrouve sur une autre langue à la première publication.
 */
export function feedPath(
  journal: Journal,
  language: string,
  languages: Languages,
): string {
  return language === languages.default.code
    ? `/${journal.base}.xml`
    : `/${journal.base}.${language}.xml`
}

/**
 * La langue derrière une adresse de flux. Les routes du flux sont statiques —
 * une par langue en ligne, toutes servies par le même module —, si bien que
 * c’est l’adresse demandée qui dit laquelle rendre.
 */
export function feedLanguage(
  journal: Journal,
  pathname: string,
  languages: Languages,
): string | undefined {
  return languages.online.find(
    (language) => feedPath(journal, language.code, languages) === pathname,
  )?.code
}

/** Les adresses de flux d’un site, dans l’ordre de ses langues en ligne. */
export function feedPaths(
  journal: Journal,
  languages: Languages,
): readonly string[] {
  return languages.online.map((language) =>
    feedPath(journal, language.code, languages),
  )
}

export type FeedInput = {
  readonly site: Site
  readonly journal: Journal
  readonly language: string
  readonly posts: readonly PostEntry[]
}

/**
 * Le nombre de billets qu’un flux porte. Un lecteur ne remonte pas plus loin,
 * et un flux qui porterait trois cents billets pèserait plus que le site.
 */
export const FEED_LIMIT = 20

export function feedXml(input: FeedInput): string {
  const origin = `https://${input.site.domain}`
  const prefix =
    input.language === input.site.languages.default.code ? '' : input.language

  const index = origin + urlFor(`/${input.journal.base}`, prefix)
  const self =
    origin + feedPath(input.journal, input.language, input.site.languages)

  const items = input.posts.slice(0, FEED_LIMIT).map((post) => {
    const link = origin + urlFor(post.route, prefix)

    return [
      '  <item>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link>${escapeXml(link)}</link>`,
      `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `    <pubDate>${rfc822(post.date)}</pubDate>`,
      ...(post.excerpt.trim() === ''
        ? []
        : [`    <description>${escapeXml(post.excerpt)}</description>`]),
      '  </item>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `  <title>${escapeXml(`${input.journal.label} — ${input.site.name}`)}</title>`,
    `  <link>${escapeXml(index)}</link>`,
    `  <description>${escapeXml(`${input.journal.label} du site ${input.site.name}.`)}</description>`,
    `  <language>${escapeXml(input.language)}</language>`,
    `  <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}

/**
 * La date au format qu’attend RSS. Le billet ne porte qu’un jour : l’heure est
 * fixée à minuit UTC, la seule valeur qui ne dépende pas de la machine qui
 * construit le site.
 */
function rfc822(date: string): string {
  const time = Date.parse(`${date}T00:00:00Z`)

  return Number.isNaN(time) ? '' : new Date(time).toUTCString()
}
