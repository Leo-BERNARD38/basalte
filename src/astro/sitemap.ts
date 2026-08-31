// `sitemap.xml`, produit au build depuis les pages du dépôt.

import { pages, posts, site } from 'virtual:basalte'

import { allPages } from '../journal/page.js'
import { sitemapXml } from '../seo/sitemap.js'

export const prerender = true

export function GET(): Response {
  return new Response(sitemapXml(site, allPages({ site, pages, posts })), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
