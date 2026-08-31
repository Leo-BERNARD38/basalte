// `basalte lint` : les conventions de ce dépôt, vérifiées plutôt que rappelées.
//
// Elle est distincte de `check`, qui valide du contenu contre des schémas. Ce
// qui est contrôlé ici est le *code* — les blocs, leur feuille de style, leur
// schéma, la place des fichiers. Deux publics différents : `check` tourne à
// l’enregistrement d’un client dans le panel, `lint` tourne quand quelqu’un
// écrit du code. Les mêler ferait échouer un enregistrement de contenu sur un
// défaut de style que le client ne peut ni voir ni corriger.

import { errorsOf, renderFinding, type Finding } from '../lint/finding.js'
import { lintProject } from '../lint/run.js'
import { fails, fix, heading, line, succeeds } from './args.js'
import type { Result } from './run.js'

export async function lint(
  _argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const findings = await lintProject(cwd)
  const lines = [...heading('lint')]

  if (findings.length === 0) {
    lines.push(line('ok', 'les conventions sont tenues'))

    return succeeds(lines)
  }

  for (const entry of findings) {
    lines.push(
      line(entry.severity === 'error' ? 'error' : 'warning', label(entry)),
      fix(entry.message),
    )
  }

  const errors = errorsOf(findings)
  const warnings = findings.length - errors.length

  if (errors.length === 0) {
    lines.push('', count(warnings, 'remarque'), '')
    lines.push(
      'Aucune n’arrête : chacune demande un choix, pas une correction.',
    )

    return succeeds(lines)
  }

  return fails(
    lines,
    `${count(errors.length, 'règle')} enfreinte(s)${warnings === 0 ? '' : `, et ${count(warnings, 'remarque')}`}.`,
  )
}

function label(entry: Finding): string {
  return `${entry.file}:${entry.line} — ${entry.rule}`
}

function count(total: number, noun: string): string {
  return `${total} ${noun}${total > 1 ? 's' : ''}`
}

export { renderFinding }
