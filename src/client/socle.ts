// Ce qu’un dépôt client déclare du socle : sa version, l’Astro qu’il exige, et
// l’adresse d’où il s’installe.
//
// Les trois sont lues dans le manifeste du paquet plutôt qu’écrites ici : un
// dépôt généré épingle exactement la version qui l’a généré, et une montée de
// version du socle suffit à changer ce que `init` produit.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { tryGit } from '../server/git.js'

export type Socle = {
  readonly name: string
  readonly version: string
  /** La version exacte d’Astro, tirée des dépendances de pair. */
  readonly astro: string
  /** `owner/dépôt`, tel qu’une dépendance git le nomme. */
  readonly repository: string
}

type Manifest = {
  readonly name: string
  readonly version: string
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly repository?: { readonly url?: string }
}

/** Le manifeste du paquet, deux niveaux au-dessus du fichier compilé. */
export function readSocle(): Socle {
  const file = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'package.json',
  )

  const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest
  const astro = manifest.peerDependencies?.['astro']

  if (astro === undefined) {
    throw new Error(
      'Le manifeste du socle ne déclare pas « astro » en dépendance de pair.',
    )
  }

  return {
    name: manifest.name,
    version: manifest.version,
    astro,
    repository: slugOf(manifest.repository?.url ?? ''),
  }
}

/** La dépendance git à écrire dans le `package.json` d’un dépôt client. */
export function socleDependency(socle: Socle): string {
  return `github:${socle.repository}#v${socle.version}`
}

export function socleRemote(socle: Socle): string {
  return `https://github.com/${socle.repository}.git`
}

/** L’adresse d’un fichier du socle à une version donnée, sans authentification. */
export function socleRawUrl(
  socle: Socle,
  reference: string,
  file: string,
): string {
  return `https://raw.githubusercontent.com/${socle.repository}/${reference}/${file}`
}

function slugOf(url: string): string {
  const match = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url)

  if (match?.[1] === undefined) {
    throw new Error(
      `« ${url} » ne nomme pas un dépôt GitHub : le socle s’installe depuis git (D5).`,
    )
  }

  return match[1]
}

const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/

/** Les tags du dépôt du socle, tels qu’il les porte. */
export async function remoteTags(
  cwd: string,
  socle: Socle,
): Promise<readonly string[]> {
  const listed = await tryGit(cwd, ['ls-remote', '--tags', socleRemote(socle)])

  if (listed.kind === 'failed') {
    throw new Error(
      `Le dépôt du socle est injoignable : ${firstLine(listed.detail)}`,
    )
  }

  return lines(listed.stdout)
    .map((row) => row.split('/').at(-1)?.trim() ?? '')
    .filter((tag) => tag !== '')
}

/**
 * Les versions que ces tags publient, de la plus ancienne à la plus récente.
 * Un tag qui n’est pas du semver strict est ignoré : le socle n’en publie pas
 * d’autre.
 */
export function versionsOf(tags: readonly string[]): readonly string[] {
  return tags
    .filter((tag) => VERSION.test(tag))
    .map((tag) => tag.slice(1))
    .toSorted(compareVersions)
}

/** Les versions publiées, de la plus ancienne à la plus récente. */
export async function publishedVersions(
  cwd: string,
  socle: Socle,
): Promise<readonly string[]> {
  return versionsOf(await remoteTags(cwd, socle))
}

/**
 * Vrai quand un tag nomme cette version sans son « v ». Le socle ne lit que
 * `vX.Y.Z`, si bien qu’un tag `X.Y.Z` est ignoré en silence : la publication
 * se lit alors comme absente, et la commande qui la réclame renvoie à un geste
 * qui vient d’être fait.
 */
export function isMistagged(version: string, tags: readonly string[]): boolean {
  return tags.includes(version) && !tags.includes(`v${version}`)
}

/**
 * Vrai quand cette version porte un tag publié. Un dépôt client épingle la
 * version qui l’a généré (D5) : sans son tag, `npm install` échoue chez le
 * client, et il échoue après que tout a été écrit.
 */
export function isPublished(
  version: string,
  published: readonly string[],
): boolean {
  return published.includes(version)
}

/** Les versions strictement postérieures à celle installée. */
export function versionsAfter(
  installed: string,
  published: readonly string[],
): readonly string[] {
  return published.filter((version) => compareVersions(installed, version) < 0)
}

export function compareVersions(a: string, b: string): number {
  const left = parts(a)
  const right = parts(b)

  for (const [index, value] of left.entries()) {
    const other = right[index] ?? 0

    if (value !== other) return value - other
  }

  return 0
}

function parts(version: string): readonly number[] {
  return version.split('.').map((part) => Number.parseInt(part, 10) || 0)
}

/** Les lignes d’une sortie de commande, sans les fins de ligne de Windows. */
export function lines(output: string): readonly string[] {
  return output.split(/\r?\n/)
}

function firstLine(output: string): string {
  return lines(output)[0] ?? ''
}
