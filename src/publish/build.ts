// Le build d’une mise en ligne, lancé en processus enfant.
//
// Il ne tourne pas dans le panel : un build qui sature la mémoire ou qui ne
// revient pas emporterait avec lui le seul écran capable de le relancer. Un
// enfant se plafonne, se tue au bout d’un temps, et sa sortie se capture pour
// l’envoyer au mainteneur.
//
// Il n’écrit pas non plus dans `dist/`, où vit le panel construit — celui-là
// même que le processus en cours exécute. Le dossier de sortie lui est donné.

import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

import { MINUTE } from '../server/durations.js'

export const BUILD_TIMEOUT = 10 * MINUTE
export const BUILD_MEMORY = 1024
export const OUTPUT_KEPT = 8000

const MODE = 'BASALTE_MODE'

export type BuildResult =
  | { readonly kind: 'built' }
  | { readonly kind: 'failed'; readonly detail: string }

/** L’Astro du dépôt, jamais une copie apportée par le socle. */
export function astroBinary(root: string): string {
  const require = createRequire(path.join(root, 'package.json'))

  return path.join(
    path.dirname(require.resolve('astro/package.json')),
    'bin',
    'astro.mjs',
  )
}

export async function buildSite(
  root: string,
  outDir: string,
): Promise<BuildResult> {
  // `BASALTE_MODE` est retiré : c’est le site public qui se construit ici, et
  // le panel garde le sien, bâti au déploiement.
  const { [MODE]: _mode, ...environment } = process.env

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [
        `--max-old-space-size=${BUILD_MEMORY}`,
        astroBinary(root),
        'build',
        '--root',
        root,
        '--outDir',
        outDir,
      ],
      {
        cwd: root,
        env: environment,
        timeout: BUILD_TIMEOUT,
        maxBuffer: 32 * 1024 * 1024,
      },
      (cause, stdout, stderr) => {
        resolve(
          cause === null
            ? { kind: 'built' }
            : { kind: 'failed', detail: tail(cause, stdout, stderr) },
        )
      },
    )
  })
}

// La fin de la sortie plutôt que son début : une erreur Astro s’écrit après
// tout ce qui a réussi.
function tail(cause: Error, stdout: string, stderr: string): string {
  const parts = [stdout.trim(), stderr.trim(), cause.message.trim()].filter(
    (part) => part !== '',
  )

  const whole = parts.join('\n\n')

  return whole.length <= OUTPUT_KEPT ? whole : whole.slice(-OUTPUT_KEPT)
}
