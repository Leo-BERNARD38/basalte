// Le panel vit dans un navigateur, et rien de `src/server/` n’a le droit d’y
// entrer.
//
// La règle est écrite depuis longtemps ; elle n’était pas tenue. Une seule
// ligne — `import { SUPPORT_PARAM } from '../astro/preview.js'`, une constante
// chaîne — traînait derrière elle l’authentification, la base SQLite et la
// bibliothèque de hachage de mots de passe. Celle-ci arrivait dans le
// navigateur en WebAssembly, et la construction du panel échouait sur un nom de
// paquet situé à quatre sauts de la cause.
//
// `verbatimModuleSyntax` recopie une clause d’import telle quelle : seul le
// mot-clé `type` l’efface. Ce test lit donc les sources comme le compilateur les
// lit, suit les imports de valeur depuis l’island, et refuse deux choses — un
// fichier de `src/server/`, et un module intégré de Node.
//
// L’analyse est faite à l’expression régulière, sans dépendance nouvelle : le
// panel n’a aucun import dynamique, et le dépôt lit déjà son propre HTML ainsi
// (`src/render/parity.ts`).

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../', import.meta.url))

/** L’entrée de l’island, montée en `client:only` par `src/astro/admin.astro`. */
const ENTRY = path.join(SRC, 'admin', 'Panel.tsx')

/** Ce qu’un fichier du panel ne doit jamais atteindre. */
const SERVER = path.join(SRC, 'server') + path.sep

// Un import sans clause — `import './panel.css'` — et un import avec clause.
// Le second capture la clause pour distinguer `import type` du reste : un
// `import { a, type B }` reste un import de valeur, et le compilateur le garde.
const BARE = /^import\s*'([^']+)'/gm
const CLAUSED = /^import\s+([\s\S]*?)\s+from\s*'([^']+)'/gm

type Visit = {
  readonly file: string
  /** Comment on y est arrivé depuis l’island, fichier par fichier. */
  readonly chain: readonly string[]
}

type Leak = Visit & { readonly reason: string }

function shown(file: string): string {
  return path.relative(SRC, file).split(path.sep).join('/')
}

/** Les spécificateurs qu’un fichier importe en valeur. */
function valueImports(source: string): readonly string[] {
  const found: string[] = []

  for (const match of source.matchAll(BARE)) found.push(match[1] ?? '')

  for (const match of source.matchAll(CLAUSED)) {
    // `import type { … } from` est effacé à la compilation, donc invisible au
    // navigateur. `import { type A, b } from` ne l’est pas.
    if (/^type\b/.test(match[1] ?? '')) continue

    found.push(match[2] ?? '')
  }

  return found
}

/**
 * Le fichier source derrière un spécificateur. Le dépôt écrit toujours le nom
 * du fichier compilé — `./Edit.js` pour `Edit.tsx` — parce que c’est lui que le
 * paquet installé résout.
 */
async function resolve(
  from: string,
  specifier: string,
): Promise<string | undefined> {
  if (!specifier.endsWith('.js')) return undefined

  const base = path.resolve(
    path.dirname(from),
    specifier.slice(0, -'.js'.length),
  )

  for (const extension of ['.ts', '.tsx']) {
    const candidate = `${base}${extension}`

    try {
      await readFile(candidate, 'utf8')

      return candidate
    } catch {
      continue
    }
  }

  return undefined
}

/** Tout ce que l’island entraîne avec elle, et ce qui n’aurait pas dû y être. */
async function walk(): Promise<{
  readonly visited: readonly string[]
  readonly leaks: readonly Leak[]
}> {
  const seen = new Set<string>([ENTRY])
  const queue: Visit[] = [{ file: ENTRY, chain: [shown(ENTRY)] }]
  const leaks: Leak[] = []

  while (queue.length > 0) {
    const here = queue.shift()

    if (here === undefined) break

    const source = await readFile(here.file, 'utf8')

    for (const specifier of valueImports(source)) {
      if (specifier.startsWith('node:')) {
        leaks.push({
          ...here,
          reason: `importe le module intégré « ${specifier} »`,
        })
        continue
      }

      if (!specifier.startsWith('.')) continue

      const target = await resolve(here.file, specifier)

      if (target === undefined) continue

      const chain = [...here.chain, shown(target)]

      if (target.startsWith(SERVER)) {
        leaks.push({ file: target, chain, reason: 'est un module du serveur' })
        continue
      }

      if (seen.has(target)) continue

      seen.add(target)
      queue.push({ file: target, chain })
    }
  }

  return { visited: [...seen].map(shown), leaks }
}

describe('l’island du panel', () => {
  it('n’entraîne ni module du serveur, ni module intégré de Node', async () => {
    const { leaks } = await walk()

    // Le rapport porte la chaîne entière : l’erreur du bundler, elle, nommait
    // un paquet WebAssembly sans dire quel fichier du panel l’avait appelé.
    const report = leaks.map(
      (leak) =>
        `${shown(leak.file)} ${leak.reason}\n    ${leak.chain.join('\n    → ')}`,
    )

    expect(report).toEqual([])
  })

  // Une expression régulière qui ne trouverait plus rien ferait passer le test
  // ci-dessus sans avoir rien parcouru.
  it('a bien parcouru le panel', async () => {
    const { visited } = await walk()

    expect(visited.length).toBeGreaterThan(20)
    expect(visited).toContain('admin/Edit.tsx')
    expect(visited).toContain('admin/fields/ImageControl.tsx')
    expect(visited).toContain('render/supports.ts')
  })
})
