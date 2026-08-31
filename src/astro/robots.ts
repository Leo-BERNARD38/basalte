// `robots.txt`, produit au build : il nomme le sitemap et écarte le panel.

import { site } from 'virtual:basalte'

import { robotsTxt } from '../seo/sitemap.js'

export const prerender = true

export function GET(): Response {
  return new Response(robotsTxt(site), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
