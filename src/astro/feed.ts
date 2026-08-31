// Le flux du journal, produit au build. Une adresse par langue en ligne, et un
// seul module pour toutes : c’est l’adresse demandée qui dit laquelle rendre.

import { posts, site } from 'virtual:basalte'

import { feedLanguage, feedXml } from '../journal/feed.js'
import { postEntries } from '../journal/page.js'

export const prerender = true

export function GET({ url }: { url: URL }): Response {
  const journal = site.journal

  if (journal === undefined) return new Response(null, { status: 404 })

  const language = feedLanguage(journal, url.pathname, site.languages)

  if (language === undefined) return new Response(null, { status: 404 })

  return new Response(
    feedXml({
      site,
      journal,
      language,
      posts: postEntries(journal, posts, language),
    }),
    { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } },
  )
}
