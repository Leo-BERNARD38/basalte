// Le plancher de contraste du panel, vérifié plutôt qu’affirmé (D164).
//
// C’est la même règle que `contrast.ts` applique aux tokens d’un site, sur
// l’autre système de tokens : le calcul est partagé, seules les paires
// diffèrent. Elles ne sont pas le produit de toutes les couleurs par toutes
// les surfaces — ce sont celles qui se superposent vraiment. Une paire
// inventée rendrait une erreur que personne ne peut corriger, puisque
// personne ne l’écrit.
//
// Le seuil du dessin ne vaut que pour ce qui **porte une information** : la
// barre d’un histogramme, le remplissage d’une jauge, l’anneau de focus. Ce
// qui sépare ou décore en est tenu dehors, et nommément — le filet entre deux
// plans, la poignée au repos, le glyphe inerte posé sur un aplat, et le ton
// d’un contrôle éteint. Les y inclure ne les rendrait pas plus lisibles : cela
// obligerait à les assombrir jusqu’à ce qu’ils se lisent comme du contenu, et
// c’est précisément ce que la planche refuse. La poignée se donne autrement —
// elle passe à l’encre 3 au survol et au focus, et une section se déplace
// aussi au clavier.

import { tokens } from '../admin/tokens.js'
import { contrast, MINIMUM_RATIO } from './contrast.js'
import { finding, type Finding } from './finding.js'

/** Le seuil de l’AA sur ce qui est dessiné plutôt que lu. */
export const GRAPHIC_RATIO = 3

/** Les trois plans clairs sur lesquels le panel pose du texte. */
const SURFACES = {
  'surface.canvas': tokens.surface.canvas,
  'surface.card': tokens.surface.card,
  'surface.raised': tokens.surface.raised,
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
 * Chaque niveau d’encre sur chacun des trois plans clairs, l’encre du plan
 * sombre, l’accent partout où il porte du texte, le rouge du refus, et ce qui
 * se dessine en portant une valeur.
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
      front: 'accent.stroke',
      frontValue: tokens.accent.stroke,
      back: name,
      backValue: value,
      what: 'le trait de l’accent — variation, lien survolé, action seconde',
      ratio: MINIMUM_RATIO,
    })
  }

  // Un graphique vit dans une carte, jamais à même le canvas : c’est là que la
  // barre et la marque d’état se superposent réellement.
  for (const [name, value] of Object.entries({
    'surface.card': tokens.surface.card,
    'surface.raised': tokens.surface.raised,
  })) {
    pairs.push({
      front: 'mute.chart',
      frontValue: tokens.mute.chart,
      back: name,
      backValue: value,
      what: 'la barre d’un histogramme, qui porte une valeur',
      ratio: GRAPHIC_RATIO,
    })

    pairs.push({
      front: 'state.online',
      frontValue: tokens.state.online,
      back: name,
      backValue: value,
      what: 'la marque « en ligne »',
      ratio: GRAPHIC_RATIO,
    })
  }

  // Le plan sombre : la barre du haut, et le bouton qui met en ligne.
  for (const [level, ink] of Object.entries(tokens.onInk)) {
    pairs.push({
      front: `onInk.${level}`,
      frontValue: ink,
      back: 'surface.ink',
      backValue: tokens.surface.ink,
      what: `le texte d’encre ${level} sur la barre`,
      ratio: MINIMUM_RATIO,
    })
  }

  // L’aplat de ce qu’on modifie porte deux encres : la noire, et la sienne.
  for (const [name, wash] of Object.entries({
    'accent.wash': tokens.accent.wash,
    'accent.veil': tokens.accent.veil,
  })) {
    pairs.push({
      front: 'accent.ink',
      frontValue: tokens.accent.ink,
      back: name,
      backValue: wash,
      what: 'l’encre seconde sur l’aplat d’accent',
      ratio: MINIMUM_RATIO,
    })

    pairs.push({
      front: 'ink.1',
      frontValue: tokens.ink[1],
      back: name,
      backValue: wash,
      what: 'le texte d’une ligne choisie',
      ratio: MINIMUM_RATIO,
    })
  }

  pairs.push({
    front: 'state.refused',
    frontValue: tokens.state.refused,
    back: 'surface.card',
    backValue: tokens.surface.card,
    what: 'ce qui refuse, et ce qui détruit',
    ratio: MINIMUM_RATIO,
  })

  pairs.push({
    front: 'state.refused',
    frontValue: tokens.state.refused,
    back: 'state.refusedWash',
    backValue: tokens.state.refusedWash,
    what: 'le titre d’un bandeau de refus',
    ratio: MINIMUM_RATIO,
  })

  for (const [level, ink] of Object.entries(tokens.ink)) {
    pairs.push({
      front: `ink.${level}`,
      frontValue: ink,
      back: 'state.refusedWash',
      backValue: tokens.state.refusedWash,
      what: `le texte d’encre ${level} sur une ligne fautive`,
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
