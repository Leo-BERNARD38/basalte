// Les valeurs du système du panel, dans un module pur.
//
// Le panel n’emprunte rien aux tokens du site (D65) : la direction artistique
// d’un client ne décide pas de la lisibilité de son outil de travail. Ce
// module est la seule source ; `panel.css` en pose les variables `--panel-*`
// et `src/admin/tokens.test.ts` vérifie que les deux disent la même chose.
// `basalte lint` le relit pour tenir le plancher de contraste (D164), et c’est
// pourquoi il n’importe rien : la commande est du Node.
//
// Quatre principes portent l’allure. Un filet d’un pixel sépare deux plans, et
// l’ombre ne reste qu’à ce qui flotte réellement au-dessus du reste. L’action
// est noire ; l’accent ne dit jamais « fais », il dit « voici ce que tu
// modifies » et « voici ce qui se mesure ». Le neutre est pur, sans une teinte.
// La forme pleine est le défaut, et trois familles gardent l’arête — les
// champs et les lignes de liste, parce qu’une colonne se lit sur un axe
// vertical net, et les surfaces, parce qu’on ne manipule pas une carte.

export const tokens = {
  surface: {
    /** Le seul gris de fond : le canvas de l’application, la scène d’aperçu. */
    canvas: '#f5f5f5',
    card: '#ffffff',
    /** Le creux d’une carte posée dans une autre, et l’en-tête d’un tableau. */
    raised: '#fafafa',
    /** Le plan sombre : la barre du haut et le bouton qui agit. */
    ink: '#17171a',
    /** Le noir plein, où le plan sombre n’a plus qu’un cran à descendre. */
    inkHover: '#000000',
  },

  /**
   * Trois niveaux, pas quatre : entre l’encre pleine et une surface presque
   * blanche, un quatrième gris lisible à 4,5:1 serait indiscernable du
   * troisième.
   */
  ink: {
    1: '#17171a',
    2: '#5c5c60',
    3: '#6e6e73',
  },

  /** L’encre posée sur le plan sombre. */
  onInk: {
    1: '#ffffff',
    2: '#c2c2c6',
    3: '#a1a1a6',
  },

  /** Le filet, à la distance où il sépare. */
  line: {
    /** Entre deux plans d’une même page — carte, tableau, champ. */
    hair: '#ebebed',
    /** Autour d’un objet posé sur le canvas — barre flottante. */
    edge: '#e6e6e8',
    /** Autour de ce qui flotte au-dessus — menu, modale. */
    strong: '#e2e2e5',
    /** Entre deux lignes d’un même tableau. */
    soft: '#f2f2f4',
  },

  /** Ce qui est dessiné plutôt que lu, et ne porte donc jamais de texte. */
  mute: {
    /**
     * La barre d’un graphique qui n’est pas aujourd’hui. Elle porte une
     * valeur : c’est le seul de ces trois gris qui tienne le plancher du
     * dessin, et c’est pourquoi il est plus sombre qu’il n’en a l’air.
     */
    chart: '#8e8e95',
    /** La poignée au repos, le glyphe inerte. */
    draw: '#c2c2c6',
    /** Le libellé d’un contrôle éteint. Jamais sur blanc. */
    inert: '#a1a1a6',
  },

  /**
   * Le pétrole. Deux emplois et pas un de plus : ce que le client modifie, et
   * ce qui se mesure. Assez sourd pour ne jamais entrer en conflit avec les
   * couleurs du site qu’il est en train d’éditer.
   */
  accent: {
    /** Une marque posée sur un aplat d’accent. */
    veil: '#dbeeeb',
    /** L’aplat de ce qu’on désigne. L’encre y reste noire. */
    wash: '#cfe6e3',
    /** Le filet d’une marque d’accent posée sur l’aplat. */
    line: '#a9cfca',
    /** Le même filet, quand la marque est sur blanc. */
    edge: '#8fbdb8',
    /** Un glyphe inerte posé sur l’aplat. Jamais du texte. */
    glyph: '#6f9b9a',
    /** Le trait : ce qui se mesure, le lien survolé, le focus. */
    stroke: '#0f6b70',
    /** L’encre seconde, uniquement sur l’aplat. */
    ink: '#12494c',
  },

  state: {
    /** Tout est enregistré, la section paraît. Toujours doublé du mot. */
    online: '#1a7f4b',
    /** Ce qui bloque l’enregistrement, et ce qui détruit. */
    refused: '#c0362c',
    refusedWash: '#fdf1f0',
    refusedLine: '#f6d9d6',
  },

  /** Le voile posé sur le plan sombre, où aucun gris ne tiendrait. */
  veil: {
    hover: 'rgb(255 255 255 / 9%)',
    chip: 'rgb(255 255 255 / 8%)',
    chipHover: 'rgb(255 255 255 / 15%)',
  },

  /** Le seul noir du panel, et il n’est pas une encre. */
  scrim: 'rgb(23 23 26 / 44%)',

  /**
   * Les hachures à 45°. Elles ne décorent aucun fond : elles marquent les
   * trois choses qui n’existent pas encore sur le site — un brouillon, une
   * section masquée, un emplacement vide.
   */
  hatch:
    'repeating-linear-gradient(45deg, rgb(23 23 26 / 7.5%) 0 1px, transparent 1px 6px)',

  /**
   * La forme pleine est le défaut. Ces quatre rayons sont ce qui garde une
   * arête : un champ, une ligne de liste, une carte, une fenêtre.
   */
  radius: {
    field: '8px',
    nested: '10px',
    surface: '12px',
    modal: '14px',
    pill: '999px',
    /** L’arrondi d’une barre de graphique : un dessin, pas une surface. */
    bar: '3px',
  },

  space: {
    hair: '1px',
    xxs: '2px',
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '20px',
    xxxl: '24px',
  },

  text: {
    micro: '10px',
    eyebrow: '11px',
    small: '12px',
    body: '13px',
    lead: '15px',
    title: '20px',
    display: '32px',
  },

  font: {
    sans: "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  /** Les hauteurs de contrôle, et rien entre elles. */
  control: {
    /** La micro-marque, qui tient dans la hauteur d’une ligne de liste. */
    mark: '19px',
    xs: '26px',
    sm: '28px',
    md: '32px',
    /** La ligne de liste, et la barre du haut. */
    row: '34px',
    bar: '52px',
    /** La cible tactile, sous 60 rem. */
    touch: '48px',
  },

  /** Les largeurs de lecture. */
  width: {
    form: '420px',
    page: '860px',
    rail: '388px',
    menu: '322px',
    modal: '960px',
    /** Le cadre de l’aperçu en mobile. */
    phone: '414px',
  },

  /** L’ombre grandit avec la distance au document. Rien d’autre en porte. */
  shadow: {
    /** Le bouton à filet — un cheveu, pour qu’il ne s’aplatisse pas. */
    button: '0 1px 1px rgb(23 23 26 / 4%)',
    /** La pastille d’un interrupteur à segments, dans sa glissière. */
    thumb: '0 1px 2px rgb(23 23 26 / 7%)',
    /** La barre flottante posée sur le canvas. */
    float: '0 4px 16px rgb(23 23 26 / 9%)',
    /** Le menu déroulant, et la ligne qu’on est en train de déplacer. */
    menu: '0 14px 36px rgb(23 23 26 / 16%)',
    /** La modale — le seul plan qui éteint la page derrière lui. */
    modal: '0 24px 70px rgb(23 23 26 / 28%)',
  },
} as const

export type PanelTokens = typeof tokens
