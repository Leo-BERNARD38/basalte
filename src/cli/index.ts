#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { run } from './run.js'

// Le fichier compilé vit dans `dist/cli/`, le manifeste deux niveaux au-dessus,
// aussi bien dans le dépôt qu'une fois installé dans `node_modules/`.
const manifest = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'package.json',
)

const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as {
  version: string
}

const result = run(process.argv.slice(2), version)

process.stdout.write(result.stdout)
process.stderr.write(result.stderr)
process.exitCode = result.code
