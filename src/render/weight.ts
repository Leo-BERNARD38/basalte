// Le poids d’une page, mesuré sur ce que le build a écrit.
//
// Une liste de bloc n’a plus de borne haute (D160), et c’est bien ce qu’on
// voulait : une FAQ s’allonge autant que le client en a. Mais la borne tenait
// une chose qu’elle ne disait pas — une galerie de soixante photos se compte
// en mégaoctets, et personne ne l’aurait vu avant la mise en ligne.
//
// Ce qui est compté est ce qu’un navigateur télécharge en ouvrant la page : son
// HTML, ses feuilles de style, et pour chaque image la plus large de ses
// dérivées — celle qu’un grand écran choisit dans le `srcset`. Les documents
// n’y sont pas : un PDF part au clic, jamais à l’ouverture.
//
// Il avertit, il ne refuse pas (D162). Le refus arriverait à la publication,
// sur du contenu écrit la veille, et il n’y a pas de poids au-delà duquel une
// page cesse de fonctionner — il y a un poids au-delà duquel elle se fait
// attendre.

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import type { ContentIssue } from '../content/report.js'
import { documentWeight } from '../media/resolve.js'
import { isRedirect, pagesUnder, PAGE_FILE } from './parity.js'

/** Au-delà, la page se fait attendre sur une connexion mobile ordinaire. */
export const PAGE_BUDGET = 2 * 1024 * 1024

const ASSET =
  /\/(?:media\/[0-9a-f]{16}-(\d+)\.webp|_astro\/[\w.-]+\.css)(?=[\s"',)])/g

export async function checkWeight(
  outDir: string,
): Promise<readonly ContentIssue[]> {
  const issues: ContentIssue[] = []

  for (const page of await pagesUnder(outDir)) {
    const file = path.join(outDir, page, PAGE_FILE)
    const html = await readFile(file, 'utf8').catch(() => undefined)

    if (html === undefined || isRedirect(html)) continue

    let bytes = Buffer.byteLength(html)

    for (const asset of downloaded(html)) {
      bytes += await sizeOf(path.join(outDir, asset))
    }

    if (bytes <= PAGE_BUDGET) continue

    issues.push({
      severity: 'warning',
      page: page === '' ? '/' : `/${page}`,
      message: `cette page pèse ${documentWeight(bytes)} à l’ouverture, au-delà des ${documentWeight(PAGE_BUDGET)} qu’on s’accorde : retire des images, ou coupe la page en deux`,
    })
  }

  return issues
}

/**
 * Ce que le navigateur va chercher en ouvrant la page. Une image y figure une
 * fois, par sa plus large dérivée : les cinq autres sont le même contenu, et
 * un écran n’en télécharge qu’une.
 */
export function downloaded(html: string): readonly string[] {
  const widest = new Map<string, number>()
  const styles = new Set<string>()

  for (const [url, width] of html.matchAll(ASSET)) {
    if (width === undefined) {
      styles.add(url.slice(1))
      continue
    }

    const key = url.slice(0, url.lastIndexOf('-'))

    widest.set(key, Math.max(widest.get(key) ?? 0, Number(width)))
  }

  return [
    ...styles,
    ...[...widest].map(([key, width]) => `${key.slice(1)}-${width}.webp`),
  ]
}

async function sizeOf(file: string): Promise<number> {
  return (await stat(file).catch(() => undefined))?.size ?? 0
}
