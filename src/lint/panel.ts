// Le plancher de contraste du panel, vérifié plutôt qu’affirmé (D164).
//
// C’est la même règle que `contrast.ts` applique aux tokens d’un site, sur
// l’autre système de tokens : le calcul est partagé, seules les paires
// diffèrent. Elles ne sont pas le produit de toutes les couleurs par toutes
// les surfaces — ce sont celles que Material superpose vraiment : chaque
// encre sur la surface et ses cinq conteneurs, chaque « on » sur son
// conteneur, et ce qui se dessine en portant une valeur. Une paire inventée
// rendrait une erreur que personne ne peut corriger, puisque personne ne
// l’écrit.
//
// Les mêmes paires se mesurent trois fois : sur le schéma neutre en clair et
// en sombre — les littéraux de `tokens.ts` —, et sur la graine qu’un site
// déclare, au lint de son dépôt. Le générateur garantit le plancher par
// construction (D196) ; la mesure est ce qui le prouve.
//
// Le seuil du dessin ne vaut que pour ce qui **porte une information** : la
// barre d’un histogramme, l’anneau de focus, le point qui dit « en ligne ».
// Ce qui sépare ou décore en est tenu dehors, et nommément — le filet entre
// deux plans (`outlineVariant`), les couches d’état, et le ton d’un contrôle
// éteint. Les y inclure obligerait à les assombrir jusqu’à ce qu’ils se
// lisent comme du contenu, et c’est précisément ce que la planche refuse.

import { scheme, type Role, type Scheme } from '../admin/scheme.js'
import { tokens } from '../admin/tokens.js'
import { contrast, MINIMUM_RATIO } from './contrast.js'
import { finding, type Finding } from './finding.js'

/** Le seuil de l’AA sur ce qui est dessiné plutôt que lu. */
export const GRAPHIC_RATIO = 3

export type Pair = {
  readonly front: string
  readonly frontValue: string
  readonly back: string
  readonly backValue: string
  readonly what: string
  readonly ratio: number
}

/** La surface et ses cinq conteneurs : tout ce sur quoi une encre se pose. */
const PLANES: readonly Role[] = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
]

/** Chaque « on » sur ce qu’il recouvre. */
const CONTAINED: readonly [Role, Role, string][] = [
  ['onPrimary', 'primary', 'le texte du bouton plein'],
  ['onPrimaryContainer', 'primaryContainer', 'le texte du bouton flottant'],
  ['onSecondary', 'secondary', 'le texte sur la couleur secondaire'],
  [
    'onSecondaryContainer',
    'secondaryContainer',
    'le texte de ce qui est choisi, et du bouton tonal',
  ],
  ['onTertiary', 'tertiary', 'le texte sur la couleur tertiaire'],
  [
    'onTertiaryContainer',
    'tertiaryContainer',
    'le texte d’une marque tertiaire',
  ],
  ['onError', 'error', 'le texte de ce qui refuse'],
  ['onErrorContainer', 'errorContainer', 'le texte d’un bandeau de refus'],
  ['onSuccess', 'success', 'le texte sur le vert'],
  [
    'onSuccessContainer',
    'successContainer',
    'le texte d’une marque « en ligne »',
  ],
  ['onWarning', 'warning', 'le texte sur l’ambre'],
  [
    'onWarningContainer',
    'warningContainer',
    'le texte d’un bandeau à regarder',
  ],
  ['inverseOnSurface', 'inverseSurface', 'le texte d’une snackbar'],
  ['inversePrimary', 'inverseSurface', 'l’action d’une snackbar'],
]

/**
 * Les paires d’un schéma. `label` nomme le schéma dans le rapport — « light »,
 * « dark », ou la graine d’un site.
 */
export function schemePairs(colours: Scheme, label: string): readonly Pair[] {
  const pairs: Pair[] = []
  const pair = (
    front: Role,
    back: Role,
    what: string,
    ratio: number = MINIMUM_RATIO,
  ): void => {
    pairs.push({
      front: `${label}.${front}`,
      frontValue: colours[front],
      back: `${label}.${back}`,
      backValue: colours[back],
      what,
      ratio,
    })
  }

  for (const plane of PLANES) {
    pair('onSurface', plane, 'le texte courant')
    pair('onSurfaceVariant', plane, 'le texte secondaire')
  }

  // Le texte coloré à même un plan : l’étiquette d’un bouton texte, l’aide
  // d’un champ en erreur, un titre de bandeau ambre.
  for (const plane of [
    'surface',
    'surfaceContainerLow',
    'surfaceContainerHigh',
  ] as const) {
    pair('primary', plane, 'l’étiquette d’un bouton texte')
    pair('error', plane, 'l’aide d’un champ refusé')
    pair('warning', plane, 'ce qui demande un regard')
  }

  for (const [front, back, what] of CONTAINED) pair(front, back, what)

  // Ce qui se dessine en portant une valeur : la barre d’un histogramme,
  // l’anneau de focus, le contour d’un champ, le point « en ligne ».
  for (const plane of ['surface', 'surfaceContainerHigh'] as const) {
    pair('primary', plane, 'la barre d’un histogramme', GRAPHIC_RATIO)
    pair('secondary', plane, 'l’anneau de focus', GRAPHIC_RATIO)
    pair('outline', plane, 'le contour d’un champ', GRAPHIC_RATIO)
    pair('success', plane, 'la marque « en ligne »', GRAPHIC_RATIO)
  }

  return pairs
}

/** Les paires du schéma neutre, en clair puis en sombre. */
export function panelPairs(): readonly Pair[] {
  return [
    ...schemePairs(tokens.color.light, 'light'),
    ...schemePairs(tokens.color.dark, 'dark'),
  ]
}

function measure(
  file: string,
  pairs: readonly Pair[],
  rule: string,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const pair of pairs) {
    const measured = contrast(pair.frontValue, pair.backValue)

    if (measured === undefined || measured >= pair.ratio) continue

    findings.push(
      finding({
        file,
        line: 1,
        rule,
        message: `${pair.what} — « ${pair.front} » sur « ${pair.back} » ne donne que ${measured.toFixed(1)}:1, il en faut ${pair.ratio}.`,
        severity: 'error',
      }),
    )
  }

  return findings
}

export function panelContrast(file: string): readonly Finding[] {
  return measure(file, panelPairs(), 'design/panel-contrast')
}

/** Le même plancher, sur le schéma qu’un site tire de sa graine. */
export function seedContrast(file: string, seed: string): readonly Finding[] {
  return measure(
    file,
    [
      ...schemePairs(scheme(seed, 'light'), `${seed} light`),
      ...schemePairs(scheme(seed, 'dark'), `${seed} dark`),
    ],
    'design/panel-contrast',
  )
}
