// La règle « une borne haute de liste se justifie, ou elle sort » (D160).
//
// Une borne sur un texte protège la direction artistique : un titre de cent
// quarante signes casse le bandeau qui le porte. Sur une liste, presque jamais
// — une grille « auto-fit » ou un « flex-wrap » s’allonge sans rien casser, et
// la borne n’y est plus qu’une opinion sur ce que le client a le droit
// d’écrire. Une seule du socle est méritée, celle du menu de l’en-tête, qui
// est une rangée sans repli.
//
// Aucune machine ne sait laquelle est laquelle : le contrôle demande la phrase
// qui le dit, et avertit quand elle manque, comme il le fait d’un script dans
// un bloc.

import { finding, type Finding } from './finding.js'
import { balance, isComment, withoutText } from './source.js'

const OPENS = 'f.list('

/** La profondeur des options d’une liste : sa parenthèse, puis son accolade. */
const OPTIONS = 2

const MESSAGE =
  'cette borne haute de liste n’est justifiée par rien — écris au-dessus le commentaire qui dit ce que la mise en page casse sans elle, ou retire-la : une grille qui s’allonge n’a pas besoin d’être bornée.'

export function listBounds(file: string, source: string): readonly Finding[] {
  const findings: Finding[] = []
  let depth = 0
  let justified = false

  for (const [index, text] of source.split(/\r?\n/).entries()) {
    if (isComment(text)) {
      justified = true
      continue
    }

    const code = withoutText(text)
    const opens = code.indexOf(OPENS)
    const bound = /(?:^|[\s{,])max\s*:/.exec(code)

    if (!justified && depthOf(code, depth, opens, bound) === OPTIONS) {
      findings.push(
        finding({
          file,
          line: index + 1,
          rule: 'list/bound',
          message: MESSAGE,
          severity: 'warning',
        }),
      )
    }

    depth =
      depth > 0
        ? Math.max(depth + balance(code), 0)
        : opens === -1
          ? 0
          : Math.max(balance(code.slice(opens + OPENS.length - 1)), 0)

    justified = false
  }

  return findings
}

/**
 * Où se trouve la borne rencontrée, comptée depuis l’ouverture de la liste.
 * Une borne posée sur un champ de l’élément — `of: { titre: f.text({ max }) }`
 * — est une borne de texte : elle est plus profonde, et ne regarde pas cette
 * règle.
 */
function depthOf(
  code: string,
  depth: number,
  opens: number,
  bound: RegExpExecArray | null,
): number {
  if (bound === null) return 0
  if (depth > 0) return depth + balance(code.slice(0, bound.index))
  if (opens === -1 || bound.index < opens) return 0

  return balance(code.slice(opens + OPENS.length - 1, bound.index))
}
