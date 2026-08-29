// `basalte check` : valide les contenus contre les schémas de leurs blocs, et
// construit le site sous `--build`.
//
// Il n’est pas un test d’intégration. Il ne touche ni à l’authentification, ni
// à la bascule atomique — seulement au contenu, à ses schémas et aux médias
// qu’il référence.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

import { errorsOf, readProject, type Project } from '../content/project.js'
import { renderIssue, type ContentIssue } from '../content/report.js'
import { prepareMedia } from '../media/prepare.js'
import { countMediaUsage } from '../media/usage.js'
import type { Result } from './run.js'

/** Où `--build` écrit, à côté de la racine servie en local et jamais dans `dist/`. */
export const CHECK_OUT = path.join('.basalte', 'check')

export async function check(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const build = argv.includes('--build')
  const prepared = await prepareMedia(cwd)
  const project = await readProject(cwd)
  const lines = [`basalte check — ${project.site.name}`, '']

  for (const media of prepared) {
    lines.push(`  ✓ « ${media.from} » intégré sous la clé « ${media.key} »`)
  }

  const issues = [...project.issues, ...orphans(project)]
  const sections = project.pages.reduce(
    (total, entry) => total + entry.page.blocks.length,
    0,
  )

  const errors = errorsOf(issues)

  for (const issue of issues) {
    lines.push(
      `  ${issue.severity === 'error' ? '✗' : '⚠'} ${renderIssue(issue)}`,
    )
  }

  if (errors.length > 0) {
    lines.push(
      '',
      `${errors.length} problème(s) à corriger. Rien n’a été construit.`,
      '',
    )

    return { code: 1, stdout: '', stderr: lines.join('\n') }
  }

  lines.push(
    `  ✓ ${count(project.pages.length, 'page')}, ${count(sections, 'section')}, ${count(project.sources.length, 'bloc')} disponible(s)`,
  )

  // La sortie précède la construction : Astro écrit directement sur le
  // terminal, et un rapport rendu après elle se lirait à l’envers.
  if (build) {
    process.stdout.write(`${lines.join('\n')}\n\nConstruction…\n\n`)

    try {
      buildSite(cwd)
    } catch {
      return { code: 1, stdout: '', stderr: 'La construction a échoué.\n' }
    }

    return { code: 0, stdout: '', stderr: '' }
  }

  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

// Une image que plus aucune section ne cite reste dans le dépôt : git ne
// supprime rien, et la retirer à la main casserait un retour arrière. Le
// signaler suffit — c’est le panel qui sait la supprimer proprement.
function orphans(project: Project): readonly ContentIssue[] {
  const usage = countMediaUsage(
    project.registry,
    project.pages.map((entry) => entry.page),
  )

  return Object.keys(project.media)
    .filter((key) => (usage.get(key) ?? 0) === 0)
    .map((key) => ({
      severity: 'warning' as const,
      page: 'médiathèque',
      message: `l’image « ${key} » n’est employée par aucune section`,
    }))
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
  const require = createRequire(path.join(cwd, 'package.json'))
  const astro = path.join(
    path.dirname(require.resolve('astro/package.json')),
    'bin',
    'astro.mjs',
  )

  execFileSync(
    process.execPath,
    [astro, 'build', '--outDir', path.join(cwd, CHECK_OUT)],
    { cwd, stdio: 'inherit' },
  )
}
