// Le plan de titres d’une page, et sa vérification sur le HTML produit.
//
// Un document commence par un `h1` qui dit de quoi il parle. Avant cette
// phase, seul le bandeau en rendait un : une page de contact ou des mentions
// légales ouvraient en `h2`, sous un `h1` qui n’existait nulle part — un plan
// cassé, que les lecteurs d’écran annoncent et que les moteurs lisent.
//
// La règle est celle de la page, pas celle du bloc : le rang d’un titre dépend
// de la place de sa section, jamais de son type. La première section visible
// porte le `h1`, les suivantes ouvrent en `h2`. Un bloc écrit avant cette
// phase ignore la prop et continue de rendre ce qu’il rendait.
//
// Le chrome, lui, ne porte aucun titre : le nom du site est sur toutes les
// pages, et en faire un `h1` donnerait à chacune le même titre, qui n’en
// décrirait aucune.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { ContentIssue } from '../content/report.js'
import { isRedirect, pagesUnder, PAGE_FILE } from './parity.js'

export type Heading = 'h1' | 'h2'

/** Le rang du titre d’une section, d’après sa place dans la page. */
export function headingOf(index: number): Heading {
  return index === 0 ? 'h1' : 'h2'
}

/**
 * Le plan de chaque page construite. Il avertit sans bloquer, comme le contrat
 * des deux rendus (D108) : le titre d’une section est facultatif, si bien
 * qu’une page qui ouvre sur une galerie sans titre n’a pas de `h1` — c’est du
 * référencement perdu, pas une panne.
 */
export async function checkHeadings(
  outDir: string,
): Promise<readonly ContentIssue[]> {
  const issues: ContentIssue[] = []

  for (const page of await pagesUnder(outDir)) {
    const html = await readFile(
      path.join(outDir, page, PAGE_FILE),
      'utf8',
    ).catch(() => undefined)

    if (html === undefined || isRedirect(html)) continue

    const found = countHeadings(html)

    if (found === 1) continue

    issues.push({
      severity: 'warning',
      page: page === '' ? '/' : `/${page}`,
      message:
        found === 0
          ? 'cette page n’a pas de titre principal : sa première section n’en affiche aucun'
          : `cette page porte ${found} titres principaux, là où un document n’en a qu’un`,
    })
  }

  return issues
}

function countHeadings(html: string): number {
  return [...html.matchAll(/<h1\b/gi)].length
}
