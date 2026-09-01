// Les versions du site sur la machine, et le lien que Caddy sert.
//
//   /srv/site/
//   ├── releases/2026-08-29T15-21-40/     la version en ligne
//   ├── releases/2026-08-29T14-03-12/     la précédente, conservée
//   └── current -> releases/2026-08-29T15-21-40
//
// Le build écrit directement dans un dossier de version encore inachevé, à côté
// des autres et sur le même système de fichiers : le rendre visible n’est plus
// alors qu’un renommage, puis un lien remplacé. Un visiteur ne voit jamais un
// site à moitié reconstruit, et un build en échec laisse `current` où il est
// (invariant 11).

import { mkdir, readdir, readlink, rename, rm, symlink } from 'node:fs/promises'
import path from 'node:path'

export const RELEASES = 'releases'
export const CURRENT = 'current'
export const PARTIAL = '.partial'
export const KEEP = 5

const SITE_ROOT = 'BASALTE_SITE_ROOT'
const LOCAL = path.join('.basalte', 'site')
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/

export type Environment = Readonly<Record<string, string | undefined>>

/**
 * La racine servie par Caddy. Le conteneur la monte sur `/srv/site` ; hors
 * production elle vit dans le dépôt, où rien ne la partage avec un autre site.
 */
export function siteRoot(
  root: string,
  environment: Environment = process.env,
): string {
  const declared = environment[SITE_ROOT]

  return declared === undefined || declared.trim() === ''
    ? path.join(root, LOCAL)
    : path.resolve(declared.trim())
}

/** Un horodatage lisible et triable, sans les deux-points qu’un chemin refuse. */
export function stampOf(now: number): string {
  return new Date(now).toISOString().slice(0, 19).replace(/:/g, '-')
}

export type Opened = {
  readonly name: string
  /** Le dossier où le build écrit, encore invisible. */
  readonly partial: string
  readonly final: string
}

/** Réserve un dossier de version. Deux publications dans la même seconde ne se marchent pas dessus. */
export async function openRelease(
  serving: string,
  stamp: string,
): Promise<Opened> {
  const directory = path.join(serving, RELEASES)

  await mkdir(directory, { recursive: true })

  const taken = new Set(await entries(directory))

  let name = stamp
  let attempt = 1

  while (taken.has(name) || taken.has(`${name}${PARTIAL}`)) {
    attempt += 1
    name = `${stamp}-${attempt}`
  }

  return {
    name,
    partial: path.join(directory, `${name}${PARTIAL}`),
    final: path.join(directory, name),
  }
}

/** Rend la version visible : renommage, puis bascule du lien. */
export async function publishRelease(
  serving: string,
  opened: Opened,
): Promise<void> {
  await rename(opened.partial, opened.final)
  await switchTo(serving, opened.name)
}

// Le lien est écrit à côté puis renommé par-dessus : sous POSIX le remplacement
// est atomique, et aucune requête ne tombe sur un lien absent. Windows refuse
// de renommer par-dessus une jonction — la machine de développement accepte
// cette fenêtre d’un instant, la production est sous Linux.
export async function switchTo(serving: string, name: string): Promise<void> {
  const target = path.resolve(serving, RELEASES, name)
  const link = path.join(serving, CURRENT)
  const staged = path.join(serving, `${CURRENT}${PARTIAL}`)

  await rm(staged, { recursive: true, force: true })
  await symlink(target, staged, 'junction')

  try {
    await rename(staged, link)
  } catch {
    await rm(link, { recursive: true, force: true })
    await rename(staged, link)
  }
}

/** Le nom de la version en ligne, ou `undefined` si aucune ne l’est. */
export async function currentRelease(
  serving: string,
): Promise<string | undefined> {
  try {
    return path.basename(await readlink(path.join(serving, CURRENT)))
  } catch {
    return undefined
  }
}

/** Les versions abouties, de la plus récente à la plus ancienne. */
export async function listReleases(
  serving: string,
): Promise<readonly string[]> {
  const found = await entries(path.join(serving, RELEASES))

  return found
    .filter((name) => STAMP.test(name))
    .sort((a, b) => b.localeCompare(a))
}

/** Supprime les versions au-delà des `keep` dernières, jamais celle en ligne. */
export async function pruneReleases(
  serving: string,
  keep = KEEP,
): Promise<readonly string[]> {
  const online = await currentRelease(serving)
  const kept = new Set((await listReleases(serving)).slice(0, keep))
  const removed: string[] = []

  for (const name of await listReleases(serving)) {
    if (kept.has(name) || name === online) continue

    await rm(path.join(serving, RELEASES, name), {
      recursive: true,
      force: true,
    })

    removed.push(name)
  }

  return removed
}

/**
 * Efface les dossiers d’un build interrompu. `discardRelease` ne s’appelle que
 * lorsqu’un build rend la main : un processus tué en cours de route laisse le
 * sien pour toujours, puisque `listReleases` ne retient que les noms aboutis
 * et que la purge ne voit donc jamais un `.partial`. Le démarrage les balaie,
 * seul moment où l’on sait qu’aucun build n’écrit.
 */
export async function discardStalePartials(
  serving: string,
): Promise<readonly string[]> {
  const directory = path.join(serving, RELEASES)
  const stale = (await entries(directory)).filter((name) =>
    name.endsWith(PARTIAL),
  )

  for (const name of stale) await discardRelease(path.join(directory, name))

  return stale
}

/** Efface un dossier de version inachevé, sans jamais faire échouer ce qui l’appelle. */
export async function discardRelease(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true }).catch(() => undefined)
}

async function entries(directory: string): Promise<readonly string[]> {
  try {
    const found = await readdir(directory, { withFileTypes: true })

    return found
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}
