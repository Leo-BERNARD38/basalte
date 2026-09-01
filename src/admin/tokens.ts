// Les valeurs du système du panel, dans un module pur.
//
// Le panel n’emprunte rien aux tokens du site (D65) : la direction artistique
// d’un client ne décide pas de la lisibilité de son outil de travail. Ce
// qu’elles portent, `theme.ts` le verse dans le thème Mantine et dans les
// variables `--panel-*` ; `basalte lint` les relit pour tenir le plancher de
// contraste (D164). D’où ce module sans import : `theme.ts` entraîne
// `@mantine/core`, qui n’a rien à faire dans une commande Node.
//
// Deux principes portent l’allure : aucune bordure, et la couleur réservée aux
// actions et aux données. Ce qui sépare deux plans est un écart de valeur et
// une ombre très douce.
//
// L’encre compte trois niveaux, pas quatre : entre l’encre pleine et une
// surface presque blanche, un quatrième gris lisible à 4,5:1 serait
// indiscernable du troisième. Ce qui reste en dessous est du dessin — `line` —
// et ne porte jamais de texte.

export const tokens = {
  surface: {
    bg: '#f3f5f9',
    card: '#ffffff',
    sunken: '#eef1f7',
    hover: '#f6f8fc',
    ink: '#16181d',
  },
  ink: {
    1: '#16181d',
    2: '#565a63',
    3: '#63666f',
  },
  /** Le ton du trait dessiné : poignée, glyphe. Jamais du texte. */
  line: '#7d818b',
  accent: {
    blue: '#1266d6',
    blueMark: '#1b7cf2',
    green: '#12864f',
    orange: '#c2410c',
    red: '#b42318',
  },
  /** Le lavis rouge d’une ligne fautive : un fond, jamais une encre. */
  redWash: '#fdeeec',
  /** Le voile du recadrage : le seul noir du panel, et il n’est pas une encre. */
  scrim: 'rgb(0 0 0 / 45%)',
  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    pill: '999px',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    7: '48px',
  },
  text: {
    eyebrow: '11px',
    cap: '13px',
    body: '14px',
    lead: '16px',
    title: '22px',
    display: '38px',
  },
  control: {
    sm: '34px',
    md: '40px',
    touch: '48px',
  },
  /** Les largeurs de lecture : une colonne de formulaire, une page de tableaux. */
  measure: {
    form: '420px',
    page: '860px',
  },
  shadow: {
    sm: '0 1px 2px rgba(20, 24, 35, .06), 0 4px 10px -6px rgba(20, 24, 35, .10)',
    card: '0 1px 2px rgba(20, 24, 35, .05), 0 12px 28px -14px rgba(20, 24, 35, .13)',
    pop: '0 4px 10px rgba(20, 24, 35, .07), 0 20px 44px -16px rgba(20, 24, 35, .24)',
  },
} as const

export type PanelTokens = typeof tokens
