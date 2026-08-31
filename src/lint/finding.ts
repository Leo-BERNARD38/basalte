// Ce qu’un contrôle de conventions rapporte, et la forme sous laquelle il se
// lit — par un humain à l’écran, et par un agent qui doit savoir quoi corriger
// sans deviner.
//
// Une remarque nomme toujours trois choses : le fichier et la ligne, la règle
// enfreinte, et ce qu’il fallait écrire. La dernière est ce qui manque le plus
// souvent aux outils de ce genre : « valeur en dur » ne dit pas quoi faire,
// « emploie var(--space-5) » si.

import path from 'node:path'

export type Severity = 'error' | 'warning'

export type Finding = {
  readonly file: string
  readonly line: number
  readonly rule: string
  readonly message: string
  readonly severity: Severity
}

export function finding(input: Finding): Finding {
  return input
}

/** Le chemin tel qu’on l’écrit dans un rapport : relatif, en séparateurs POSIX. */
export function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/')
}

/** Les remarques d’abord par fichier, puis par ligne. */
export function ordered(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].toSorted(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  )
}

export function errorsOf(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((entry) => entry.severity === 'error')
}

export function renderFinding(entry: Finding): string {
  return `${entry.file}:${entry.line} — ${entry.message} [${entry.rule}]`
}
