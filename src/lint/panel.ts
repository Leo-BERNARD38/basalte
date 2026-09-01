// Le plancher de contraste du panel, vérifié plutôt qu’affirmé (D164).
//
// `docs/panel.md` promettait « 4,5:1 sur les niveaux d’encre » sans que rien ne
// l’établisse — et deux paires ne le tenaient pas. C’est la même règle que
// `contrast.ts` applique aux tokens d’un site, sur l’autre système de tokens :
// le calcul est partagé, seules les paires diffèrent.
//
// Elles ne sont pas le produit de toutes les couleurs par toutes les surfaces :
// ce sont celles qui se superposent vraiment. Une paire inventée rendrait une
// erreur que personne ne peut corriger, puisque personne ne l’écrit.

import { tokens } from '../admin/tokens.js'
import { contrast, MINIMUM_RATIO } from './contrast.js'
import { finding, type Finding } from './finding.js'

/** Le seuil de l’AA sur ce qui est dessiné plutôt que lu. */
export const GRAPHIC_RATIO = 3

/** Les quatre plans sur lesquels le panel pose du texte. */
const SURFACES = {
  'surface.card': tokens.surface.card,
  'surface.bg': tokens.surface.bg,
  'surface.sunken': tokens.surface.sunken,
  'surface.hover': tokens.surface.hover,
} as const

type Pair = {
  readonly front: string
  readonly frontValue: string
  readonly back: string
  readonly backValue: string
  readonly what: string
  readonly ratio: number
}

/**
 * Chaque niveau d’encre sur chacune des quatre surfaces, l’encre du plan sombre,
 * les accents employés en texte, et le bleu des marques — anneau de focus,
 * contour de vignette, jauge — qui se dessine et ne se lit pas.
 */
export function panelPairs(): readonly Pair[] {
  const pairs: Pair[] = []

  for (const [name, value] of Object.entries(SURFACES)) {
    for (const [level, ink] of Object.entries(tokens.ink)) {
      pairs.push({
        front: `ink.${level}`,
        frontValue: ink,
        back: name,
        backValue: value,
        what: `le texte d’encre ${level}`,
        ratio: MINIMUM_RATIO,
      })
    }

    pairs.push({
      front: 'line',
      frontValue: tokens.line,
      back: name,
      backValue: value,
      what: 'le trait dessiné — poignée, glyphe',
      ratio: GRAPHIC_RATIO,
    })

    pairs.push({
      front: 'accent.blueMark',
      frontValue: tokens.accent.blueMark,
      back: name,
      backValue: value,
      what: 'la marque bleue — anneau de focus, contour de vignette, jauge',
      ratio: GRAPHIC_RATIO,
    })
  }

  pairs.push({
    front: 'surface.card',
    frontValue: tokens.surface.card,
    back: 'surface.ink',
    backValue: tokens.surface.ink,
    what: 'le texte d’une ligne sélectionnée',
    ratio: MINIMUM_RATIO,
  })

  for (const [name, value] of Object.entries(tokens.accent)) {
    if (name === 'blueMark') continue

    pairs.push({
      front: `accent.${name}`,
      frontValue: value,
      back: 'surface.card',
      backValue: tokens.surface.card,
      what: `le texte accentué « ${name} » dans une carte`,
      ratio: MINIMUM_RATIO,
    })
  }

  return pairs
}

export function panelContrast(file: string): readonly Finding[] {
  const findings: Finding[] = []

  for (const pair of panelPairs()) {
    const measured = contrast(pair.frontValue, pair.backValue)

    if (measured === undefined || measured >= pair.ratio) continue

    findings.push(
      finding({
        file,
        line: 1,
        rule: 'design/panel-contrast',
        message: `${pair.what} — « ${pair.front} » sur « ${pair.back} » ne donne que ${measured.toFixed(1)}:1, il en faut ${pair.ratio}.`,
        severity: 'error',
      }),
    )
  }

  return findings
}
