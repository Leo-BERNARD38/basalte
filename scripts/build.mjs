// Compile `src/` vers `dist/`, puis y recopie les fichiers que tsc laisse de
// côté. Les `.astro` traversent le package intacts : c’est le build Astro du
// dépôt client qui les compile.

import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'src')
const output = path.join(root, 'dist')

const ASSET_EXTENSIONS = new Set(['.astro', '.css', '.d.ts'])

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

// Le binaire est appelé par son fichier JavaScript plutôt que par le shim
// `.cmd` que npm installe sous Windows : un seul chemin pour les deux systèmes.
const require = createRequire(import.meta.url)
const tsc = path.join(
  path.dirname(require.resolve('typescript')),
  '..',
  'bin',
  'tsc',
)

await rm(output, { recursive: true, force: true })

execFileSync(process.execPath, [tsc, '--project', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
})

let copied = 0
for await (const file of walk(source)) {
  if (!ASSET_EXTENSIONS.has(path.extname(file))) continue
  const target = path.join(output, path.relative(source, file))
  await mkdir(path.dirname(target), { recursive: true })
  await copyFile(file, target)
  copied += 1
}

process.stdout.write(`dist/ construit — ${copied} fichier(s) recopié(s)\n`)
