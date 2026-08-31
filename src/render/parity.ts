// Le contrat que les deux rendus doivent tenir, vérifié sur le HTML produit.
//
// Google indexe avec son robot smartphone, et sa documentation demande que
// contenu, métadonnées et données structurées correspondent entre les deux
// versions d’une même adresse. Autrement dit : le rendu mobile porte tout le
// contenu, le bureau ne fait que le présenter autrement. Un texte, un lien ou
// une métadonnée présent au seul bureau n’est jamais indexé — et le défaut est
// invisible à l’œil, puisque chacun des deux rendus est correct isolément.
//
// Il avertit, il ne bloque pas (D108) : la conséquence se compte en
// référencement, pas en panne, et un mot décoratif ajouté au bureau ne doit pas
// faire tomber un site qui fonctionne.
//
// La comparaison ne passe par aucun analyseur : le socle n’ajoute pas une
// dépendance pour lire son propre HTML, dont il connaît la forme. Ce qui se
// compare est ce que Google lit — le texte, les liens, et les métadonnées de
// l’en-tête.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { ContentIssue } from '../content/report.js'
import { DESKTOP_PREFIX, NOT_FOUND } from './supports.js'

/** Le fichier qu’Astro écrit pour une page, sous le dossier de sa route. */
export const PAGE_FILE = 'index.html'

/** Ce que l’en-tête doit porter à l’identique dans les deux rendus. */
type Head = {
  readonly title: string
  readonly description: string
  readonly canonical: string
  readonly alternates: readonly string[]
  readonly structured: readonly string[]
}

export function compareRenders(
  page: string,
  mobile: string,
  desktop: string,
): readonly ContentIssue[] {
  const issues: ContentIssue[] = []
  const warn = (message: string) =>
    issues.push({ severity: 'warning', page, message })

  const left = headOf(mobile)
  const right = headOf(desktop)

  if (left.title !== right.title) {
    warn(
      `le titre du rendu bureau (« ${right.title} ») n’est pas celui du mobile (« ${left.title} »)`,
    )
  }

  if (left.description !== right.description) {
    warn('la description du rendu bureau n’est pas celle du mobile')
  }

  if (left.canonical !== right.canonical) {
    warn('l’adresse canonique du rendu bureau n’est pas celle du mobile')
  }

  for (const message of missing(
    left.alternates,
    right.alternates,
    'déclaration de traduction',
  )) {
    warn(message)
  }

  for (const message of missing(
    left.structured,
    right.structured,
    'bloc de données structurées',
  )) {
    warn(message)
  }

  for (const message of missing(wordsOf(mobile), wordsOf(desktop), 'mot')) {
    warn(message)
  }

  for (const message of missing(linksOf(mobile), linksOf(desktop), 'lien')) {
    warn(message)
  }

  return issues
}

/**
 * Le contrat sur un site construit. Rend un tableau vide quand le dossier ne
 * porte pas de rendu bureau : un site à un seul rendu ne paie rien de ce
 * mécanisme.
 */
export async function checkRenders(
  outDir: string,
): Promise<readonly ContentIssue[]> {
  const root = path.join(outDir, DESKTOP_PREFIX)
  const issues: ContentIssue[] = []

  // La page 404 est hors contrat : elle porte `noindex`, aucun robot ne la
  // lit, et son jumeau mobile ne vit pas au même endroit (`404.html`, à plat).
  for (const page of (await pagesUnder(root)).filter(
    (page) => page !== NOT_FOUND,
  )) {
    const desktop = await readFile(path.join(root, page, PAGE_FILE), 'utf8')
    const mobile = await readFile(
      path.join(outDir, page, PAGE_FILE),
      'utf8',
    ).catch(() => undefined)

    if (mobile === undefined) {
      issues.push({
        severity: 'warning',
        page: address(page),
        message:
          'cette page n’existe qu’au rendu bureau : elle ne sera jamais indexée',
      })
      continue
    }

    issues.push(...compareRenders(address(page), mobile, desktop))
  }

  return issues
}

/**
 * Une page de redirection n’est pas une page : elle n’a ni titre principal, ni
 * contenu, et le build en écrit une par adresse déclarée dans `site.config.ts`.
 * Les contrôles qui parcourent le HTML produit l’écartent.
 */
export function isRedirect(html: string): boolean {
  return /<meta[^>]*http-equiv="refresh"/i.test(html)
}

function address(page: string): string {
  return page === '' ? '/' : `/${page}`
}

/** Les dossiers de pages sous une racine, en chemins relatifs à barres. */
export async function pagesUnder(
  root: string,
  prefix = '',
): Promise<readonly string[]> {
  const entries = await readdir(path.join(root, prefix), {
    withFileTypes: true,
  }).catch(() => [])

  const found = entries.some(
    (entry) => entry.isFile() && entry.name === PAGE_FILE,
  )
    ? [prefix]
    : []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    found.push(
      ...(await pagesUnder(
        root,
        prefix === '' ? entry.name : `${prefix}/${entry.name}`,
      )),
    )
  }

  return found
}

function missing(
  reference: readonly string[],
  compared: readonly string[],
  noun: string,
): readonly string[] {
  const held = new Set(reference)
  const absent = [...new Set(compared)].filter((value) => !held.has(value))

  return absent.length === 0
    ? []
    : [
        `le rendu bureau porte ${absent.length} ${noun}${absent.length > 1 ? 's' : ''} que le mobile n’a pas : ${quote(absent)}`,
      ]
}

function quote(values: readonly string[]): string {
  const shown = values.slice(0, 5).map((value) => `« ${value} »`)

  return values.length > 5
    ? `${shown.join(', ')} et ${values.length - 5} autre(s)`
    : shown.join(', ')
}

function headOf(html: string): Head {
  return {
    title: (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim(),
    description: attribute(html, /<meta[^>]*name="description"[^>]*>/i),
    canonical: attribute(html, /<link[^>]*rel="canonical"[^>]*>/i),
    alternates: [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/gi)].map(
      (found) => found[0],
    ),
    structured: [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ].map((found) => (found[1] ?? '').replace(/\s+/g, ' ').trim()),
  }
}

function attribute(html: string, tag: RegExp): string {
  const found = tag.exec(html)?.[0] ?? ''

  return (/(?:content|href)="([^"]*)"/i.exec(found)?.[1] ?? '').trim()
}

/** Les destinations des liens : un chemin offert au seul bureau est perdu. */
function linksOf(html: string): readonly string[] {
  return [...body(html).matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)]
    .map((found) => found[1] ?? '')
    .filter((href) => href !== '')
}

/**
 * Les mots du texte visible. Scripts et styles en sont retirés, les balises
 * ôtées, les entités de base rendues, et la ponctuation écartée : ce qui reste
 * est ce qu’un lecteur lit, et ce qu’un robot indexe.
 */
function wordsOf(html: string): readonly string[] {
  const text = body(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .trim()

  return text === '' ? [] : text.split(' ')
}

function body(html: string): string {
  return (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
}
