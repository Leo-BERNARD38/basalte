// `basalte check` : valide les contenus contre les schémas de leurs blocs, et
// construit le site sous `--build`.
//
// Il n’est pas un test d’intégration. Il ne touche ni à l’authentification, ni
// à la bascule atomique — seulement au contenu, à ses schémas et aux médias
// qu’il référence.
//
// Sous `--build`, deux vérifications de plus n’ont de sens qu’une fois le HTML
// écrit : le contrat des deux rendus (D108), et le fait que la machine sache
// les servir. La seconde regarde le `Caddyfile` du dépôt, écrit à l’`init` et
// jamais régénéré : c’est le seul endroit où un site plus ancien que le second
// rendu se signale avant d’être déployé.

import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { errorsOf, readProject, type Project } from '../content/project.js'
import { renderIssue, type ContentIssue } from '../content/report.js'
import { prepareMedia } from '../media/prepare.js'
import { countMediaUsage } from '../media/usage.js'
import { astroBinary } from '../publish/build.js'
import { checkRenders } from '../render/parity.js'
import { DESKTOP_PREFIX } from '../render/supports.js'
import type { Site } from '../site/define.js'
import { fails, hasFlag, heading, line, succeeds } from './args.js'
import type { Result } from './run.js'

/** Où `--build` écrit, à côté de la racine servie en local et jamais dans `dist/`. */
export const CHECK_OUT = path.join('.basalte', 'check')

export async function check(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const build = hasFlag(argv, '--build')
  const prepared = await prepareMedia(cwd)
  const project = await readProject(cwd)
  const lines = [...heading('check', project.site.name)]

  for (const media of prepared) {
    lines.push(
      line('ok', `« ${media.from} » intégré sous la clé « ${media.key} »`),
    )
  }

  const issues = [...project.issues, ...orphans(project)]
  const sections = project.pages.reduce(
    (total, entry) => total + entry.page.blocks.length,
    0,
  )

  const errors = errorsOf(issues)

  for (const issue of issues) {
    lines.push(
      line(
        issue.severity === 'error' ? 'error' : 'warning',
        renderIssue(issue),
      ),
    )
  }

  if (errors.length > 0) {
    return fails(
      lines,
      `${errors.length} problème(s) à corriger. Rien n’a été construit.`,
    )
  }

  lines.push(
    line(
      'ok',
      `${count(project.pages.length, 'page')}, ${count(sections, 'section')}, ${count(project.sources.length, 'bloc')} disponible(s)`,
    ),
  )

  // La sortie précède la construction : Astro écrit directement sur le
  // terminal, et un rapport rendu après elle se lirait à l’envers.
  if (build) {
    process.stdout.write(`${lines.join('\n')}\n\nConstruction…\n\n`)

    try {
      buildSite(cwd)
    } catch {
      return fails(['La construction a échoué.'])
    }

    const built = [
      ...(await checkRenders(path.join(cwd, CHECK_OUT))),
      ...(await staleCaddyfile(cwd, project.site)),
    ].map((issue) => line('warning', renderIssue(issue)))

    return succeeds(
      built.length === 0 ? [line('ok', 'construction faite')] : built,
    )
  }

  return succeeds(lines)
}

/**
 * Le `Caddyfile` d’un dépôt né avant le second rendu n’aiguille pas : le site
 * partirait en ligne avec ses deux rendus, et tout le monde recevrait le
 * mobile. Le fichier appartient au dépôt du client, le socle ne le réécrit
 * pas — il le dit.
 */
async function staleCaddyfile(
  cwd: string,
  site: Site,
): Promise<readonly ContentIssue[]> {
  if (!site.capabilities.desktopRender) return []

  const caddyfile = await readFile(path.join(cwd, 'Caddyfile'), 'utf8').catch(
    () => undefined,
  )

  if (
    caddyfile === undefined ||
    caddyfile.includes(`/${DESKTOP_PREFIX}{path}`)
  ) {
    return []
  }

  return [
    {
      severity: 'warning',
      page: 'Caddyfile',
      message:
        'ce site déclare un rendu bureau, et son « Caddyfile » n’aiguille pas : régénère-le depuis un « basalte init » de cette version, ou reporte son bloc « handle » final',
    },
  ]
}

// Une image ou un document que plus aucune section ne cite reste dans le
// dépôt : git ne supprime rien, et le retirer à la main casserait un retour
// arrière. Le signaler suffit — c’est le panel qui sait supprimer proprement.
function orphans(project: Project): readonly ContentIssue[] {
  const pages = project.pages.map((entry) => entry.page)

  const unused = (
    keys: readonly string[],
    kind: 'image' | 'document',
    say: (key: string) => string,
  ): readonly ContentIssue[] => {
    const usage = countMediaUsage(project.registry, pages, kind)

    return keys
      .filter((key) => (usage.get(key) ?? 0) === 0)
      .map((key) => ({
        severity: 'warning' as const,
        page: 'médiathèque',
        message: say(key),
      }))
  }

  return [
    ...unused(
      Object.keys(project.media),
      'image',
      (key) => `l’image « ${key} » n’est employée par aucune section`,
    ),
    ...unused(
      Object.keys(project.documents),
      'document',
      (key) => `le document « ${key} » n’est employé par aucune section`,
    ),
  ]
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value > 1 ? 's' : ''}`
}

// Astro est une dépendance de pair : c’est celui du dépôt qui construit, jamais
// une copie apportée par le socle.
//
// La sortie ne va pas dans `dist/`, où vit le panel construit — celui-là même
// que la machine exécute. Vérifier que le site se construit ne doit pas
// remplacer l’écran qui sert à le corriger (D68).
function buildSite(cwd: string): void {
  execFileSync(
    process.execPath,
    [astroBinary(cwd), 'build', '--outDir', path.join(cwd, CHECK_OUT)],
    { cwd, stdio: 'inherit' },
  )
}
