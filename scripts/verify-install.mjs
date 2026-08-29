// Prouve le chemin d'installation réel : un dépôt client installe le socle
// depuis git, npm clone, exécute `prepare`, et empaquette selon `files`.
//
// Le clone est fabriqué depuis le dossier de travail, pas depuis `HEAD` : ce
// qui est vérifié est le code tel qu'il est, pas tel qu'il a été commité. Le
// dépôt distant n'est jamais sollicité.

import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXCLUDED = new Set(['node_modules', 'dist', '.git', 'coverage'])

const work = await mkdtemp(path.join(os.tmpdir(), 'basalte-install-'))
const origin = path.join(work, 'socle')
const consumer = path.join(work, 'client')

try {
  await step('copie du dossier de travail', async () => {
    await cp(root, origin, {
      recursive: true,
      filter: (entry) => !EXCLUDED.has(path.basename(entry)),
    })
  })

  await step('dépôt git jetable', async () => {
    git(origin, ['init', '--quiet', '--initial-branch=main'])
    git(origin, ['add', '--all'])
    git(origin, ['commit', '--quiet', '--message', 'socle'])
  })

  await step('npm install depuis git', async () => {
    await mkdir(consumer, { recursive: true })
    await writeFile(
      path.join(consumer, 'package.json'),
      `${JSON.stringify({ name: 'client-jetable', private: true, type: 'module' }, null, 2)}\n`,
    )
    npm(consumer, ['install', `git+${pathToFileURL(origin).href}`])
  })

  const installed = path.join(
    consumer,
    'node_modules',
    '@leobernard',
    'basalte',
  )

  await step('les cibles de `exports` sont présentes', async () => {
    const manifest = JSON.parse(
      await readFile(path.join(installed, 'package.json'), 'utf8'),
    )
    const targets = collectTargets(manifest.exports)
    const missing = targets.filter(
      (target) => !existsSync(path.join(installed, target)),
    )
    if (missing.length > 0) {
      throw new Error(
        `absents du paquet : ${missing.join(', ')} — vérifie le champ « files »`,
      )
    }
    process.stdout.write(`      ${targets.length} cible(s) vérifiée(s)\n`)
  })

  await step('le binaire répond', async () => {
    const version = npx(consumer, ['basalte', '--version']).trim()
    const expected = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    ).version
    if (version !== expected) {
      throw new Error(`« ${version} » au lieu de « ${expected} »`)
    }
    process.stdout.write(`      basalte --version → ${version}\n`)
  })

  process.stdout.write('\nLe chemin d’installation depuis git fonctionne.\n')
} finally {
  await rm(work, { recursive: true, force: true })
}

async function step(label, body) {
  process.stdout.write(`  → ${label}\n`)
  await body()
}

function collectTargets(exports) {
  if (typeof exports === 'string') {
    return exports.includes('*') ? [] : [exports]
  }
  if (exports === null || typeof exports !== 'object') return []
  return Object.values(exports).flatMap(collectTargets)
}

function git(cwd, args) {
  execFileSync(
    'git',
    ['-c', 'user.email=verify@basalte', '-c', 'user.name=verify', ...args],
    { cwd, stdio: 'pipe' },
  )
}

function npm(cwd, args) {
  execFileSync(process.execPath, [npmCli(), ...args, '--no-fund'], {
    cwd,
    stdio: 'inherit',
  })
}

function npx(cwd, args) {
  return execFileSync(process.execPath, [npmCli(), 'exec', '--', ...args], {
    cwd,
    encoding: 'utf8',
  })
}

// npm est appelé par son fichier JavaScript plutôt que par le shim `.cmd` que
// Windows installe : un seul chemin pour les deux systèmes. npm renseigne
// `npm_execpath` dans les scripts qu'il lance.
function npmCli() {
  const cli = process.env['npm_execpath']
  if (cli === undefined) {
    throw new Error('à lancer par « npm run verify:install »')
  }
  return cli
}
