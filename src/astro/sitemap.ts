// `sitemap.xml`, produit au build depuis les pages du dépôt.

import { pages, site } from 'virtual:basalte'

import { sitemapXml } from '../seo/sitemap.js'

export const prerender = true

export function GET(): Response {
  return new Response(sitemapXml(site, pages), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
