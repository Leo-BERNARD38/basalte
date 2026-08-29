// `basalte check` : valide les contenus contre les schémas de leurs blocs, et
// construit le site sous `--build`.
//
// Il n’est pas un test d’intégration. Il ne touche ni à l’authentification, ni
// à la bascule atomique — seulement au contenu, à ses schémas et aux médias
// qu’il référence.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

import { errorsOf, readProject } from '../content/project.js'
import { renderIssue } from '../content/report.js'
import { prepareMedia } from '../media/prepare.js'
import type { Result } from './run.js'

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

  const issues = project.issues
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

function count(value: number, noun: string): string {
  return `${value} ${noun}${value > 1 ? 's' : ''}`
}

// Astro est une dépendance de pair : c’est celui du dépôt qui construit, jamais
// une copie apportée par le socle.
function buildSite(cwd: string): void {
  const require = createRequire(path.join(cwd, 'package.json'))
  const astro = path.join(
    path.dirname(require.resolve('astro/package.json')),
    'bin',
    'astro.mjs',
  )

  execFileSync(process.execPath, [astro, 'build'], { cwd, stdio: 'inherit' })
}
