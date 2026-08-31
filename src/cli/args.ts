// La lecture des arguments d’une commande, et les lignes qu’elle rend.
//
// Toutes les commandes partagent la même forme de sortie : un titre, des
// lignes marquées, et un `Result` dont le code dit si l’on peut continuer. Les
// avoir ici plutôt qu’une fois par commande est ce qui garde l’écran cohérent
// quand une commande s’ajoute.

import type { Result } from './run.js'

export type Level = 'ok' | 'error' | 'warning'

const MARKS: Readonly<Record<Level, string>> = {
  ok: '✓',
  error: '✗',
  warning: '⚠',
}

/** Vrai quand le drapeau est présent, avec ou sans valeur attachée. */
export function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.some((entry) => entry === name || entry.startsWith(`${name}=`))
}

/**
 * La valeur d’une option, écrite `--nom valeur` ou `--nom=valeur`. Rend
 * `undefined` quand l’option est absente ou qu’aucune valeur ne la suit.
 */
export function optionValue(
  argv: readonly string[],
  name: string,
): string | undefined {
  for (const [index, entry] of argv.entries()) {
    if (entry.startsWith(`${name}=`)) return entry.slice(name.length + 1)
    if (entry === name) return argv[index + 1]
  }

  return undefined
}

/**
 * Les arguments qui ne sont ni un drapeau ni la valeur d’une option. `valued`
 * nomme les options qui consomment le mot suivant.
 */
export function positionals(
  argv: readonly string[],
  valued: readonly string[] = [],
): readonly string[] {
  const rest: string[] = []
  let skip = false

  for (const entry of argv) {
    if (skip) {
      skip = false
      continue
    }

    if (entry.startsWith('-')) {
      skip = valued.includes(entry)
      continue
    }

    rest.push(entry)
  }

  return rest
}

/** `  ✓ texte`, à l’indentation commune à toutes les commandes. */
export function line(level: Level, text: string): string {
  return `  ${MARKS[level]} ${text}`
}

/** La ligne d’action qui suit une croix, décalée sous elle. */
export function fix(text: string): string {
  return `      → ${text}`
}

export function heading(command: string, subject?: string): readonly string[] {
  const title =
    subject === undefined
      ? `basalte ${command}`
      : `basalte ${command} — ${subject}`

  return [title, '']
}

export function succeeds(lines: readonly string[]): Result {
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

/**
 * Un échec rend tout sur la sortie d’erreur, rapport compris : ce qui a été
 * composé avant la panne se lit avec elle, jamais sur un autre canal.
 */
export function fails(lines: readonly string[], summary?: string): Result {
  const whole = summary === undefined ? lines : [...lines, '', summary]

  return { code: 1, stdout: '', stderr: `${whole.join('\n')}\n` }
}
