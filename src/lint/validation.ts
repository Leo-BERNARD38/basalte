// La règle « un bloc ne valide rien à la main » : une contrainte qui manque
// s’ajoute à `f.*`, où elle profite à tous les blocs et où le panel sait la
// rendre. Écrite dans un schéma, elle vit dans un seul bloc, n’apparaît dans
// aucun formulaire, et se contredit tôt ou tard avec le champ qu’elle garde.
//
// Le contrôle porte sur les schémas de blocs et de chrome, jamais sur le reste
// du dépôt : ailleurs, Zod et les gardes écrites à la main sont à leur place.

import { finding, type Finding } from './finding.js'
import { isComment } from './source.js'

const FORBIDDEN: readonly {
  readonly pattern: RegExp
  readonly message: string
}[] = [
  {
    pattern: /\.(?:refine|superRefine|check)\s*\(/,
    message:
      'un raffinement Zod valide à la main — la contrainte s’ajoute à « f.* », où le panel sait la rendre.',
  },
  {
    pattern: /\bthrow\s+new\b/,
    message:
      'un schéma de bloc ne lève rien — une valeur refusée l’est par « f.* », qui en donne le message en français.',
  },
  {
    pattern: /^\s*import\s[^\n]*['"]zod['"]/,
    message:
      'un schéma de bloc n’importe pas Zod — le DSL « f.* » le fait pour lui, et c’est ce qui garde le panel et le rendu d’accord.',
  },
]

export function manualValidation(
  file: string,
  source: string,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const [index, text] of source.split(/\r?\n/).entries()) {
    if (isComment(text)) continue

    for (const rule of FORBIDDEN) {
      if (!rule.pattern.test(text)) continue

      findings.push(
        finding({
          file,
          line: index + 1,
          rule: 'schema/manual',
          message: rule.message,
          severity: 'error',
        }),
      )
    }
  }

  return findings
}
