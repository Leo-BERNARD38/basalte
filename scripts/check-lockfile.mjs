// Vérifie que le lockfile porte les binaires des deux systèmes de
// développement. Plusieurs dépendances (rolldown, esbuild, lightningcss, sharp)
// publient un paquet compilé par plateforme, en dépendance optionnelle. Un
// `npm install` lancé sur un seul système peut n’inscrire que le sien ; `npm ci`
// échoue alors de l’autre côté sur un module introuvable.
//
// La règle appliquée est exacte plutôt qu’heuristique : toute dépendance
// optionnelle déclarée par un paquet du lockfile doit avoir sa propre entrée
// dans ce lockfile. C’est précisément ce qu’un élagage détruit.
//
// Une règle par famille de noms ne marcherait pas : `@img/sharp-win32-x64`
// n’a aucune dépendance, libvips étant lié statiquement dans le binaire
// Windows, alors que `@img/sharp-linux-x64` tire `@img/sharp-libvips-linux-x64`.
// Exiger une symétrie entre plateformes signalerait cette asymétrie légitime.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const PLATFORM_SUFFIX =
  /[-/](android|darwin|freebsd|linux|linuxmusl|openharmony|sunos|win32)-([a-z0-9]+)(?:-(gnu|gnueabihf|eabi|eabihf|msvc|musl))?$/

const lock = JSON.parse(
  await readFile(path.join(root, 'package-lock.json'), 'utf8'),
)

if (lock.lockfileVersion < 3) {
  fail(`lockfileVersion ${lock.lockfileVersion} — npm 7 ou plus est attendu`)
}

const packages = lock.packages ?? {}
const missing = []
let declared = 0

for (const [location, entry] of Object.entries(packages)) {
  for (const name of Object.keys(entry.optionalDependencies ?? {})) {
    declared += 1
    const nested = `${location}/node_modules/${name}`
    if (!packages[`node_modules/${name}`] && !packages[nested]) {
      missing.push(`${location.replace('node_modules/', '') || '.'} → ${name}`)
    }
  }
}

for (const line of summarise(packages)) process.stdout.write(`${line}\n`)

if (missing.length > 0) {
  fail(
    `${missing.length} dépendance(s) optionnelle(s) déclarée(s) mais absente(s) :\n` +
      missing.map((line) => `    ${line}`).join('\n') +
      '\n  → npm install --package-lock-only --os=linux --cpu=x64 --libc=glibc\n' +
      '  → npm install --package-lock-only --os=win32 --cpu=x64\n' +
      '  puis revérifie : voir docs/environnement.md',
  )
}

process.stdout.write(
  `\n${declared} dépendances optionnelles déclarées, toutes présentes.\n`,
)

/** Couverture par famille de paquets binaires, pour lecture — pas un critère. */
function summarise(packages) {
  const families = new Map()

  for (const location of Object.keys(packages)) {
    const name = location.split('node_modules/').at(-1)
    if (!name) continue
    const match = PLATFORM_SUFFIX.exec(name)
    if (!match) continue

    const [suffix, os, cpu] = match
    const family = name.slice(0, name.length - suffix.length)
    const platforms = families.get(family) ?? new Set()
    platforms.add(`${os}-${cpu}`)
    families.set(family, platforms)
  }

  return [...families].sort().map(([family, platforms]) => {
    const linux = platforms.has('linux-x64') ? 'linux-x64' : '—'
    const win32 = platforms.has('win32-x64') ? 'win32-x64' : '—'
    return `  ${family.padEnd(26)} ${linux.padEnd(10)} ${win32}`
  })
}

function fail(message) {
  process.stderr.write(`package-lock.json : ${message}\n`)
  process.exit(1)
}
