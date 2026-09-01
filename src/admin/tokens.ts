// Les valeurs du système du panel, dans un module pur.
//
// Le panel n’emprunte rien aux tokens du site (D65) : la direction artistique
// d’un client ne décide pas de la lisibilité de son outil de travail. Ce
// module est la seule source ; `panel.css` en pose les variables `--panel-*`
// et `src/admin/tokens.test.ts` vérifie que les deux disent la même chose.
// `basalte lint` le relit pour tenir le plancher de contraste (D164), et c’est
// pourquoi il n’importe rien : la commande est du Node.
//
// Cinq principes portent l’allure. Un filet d’un pixel sépare deux plans, et
// l’ombre ne reste qu’à ce qui flotte réellement au-dessus du reste. Le panel
// n’a pas de couleur d’identité : le neutre est pur, l’action est noire, ce
// qui se mesure est noir, et la sélection se donne par le poids de son aplat —
// ne restent en couleur que le vert qui dit « en ligne » et le rouge qui
// refuse. La forme pleine est le défaut, et trois familles gardent l’arête —
// les champs et les lignes de liste, parce qu’une colonne se lit sur un axe
// vertical net, et les surfaces, parce qu’on ne manipule pas une carte.
// Enfin, l’écart porte la hiérarchie avant le trait : l’échelle monte jusqu’à
// la gouttière d’un écran, et la typographie ne compte que cinq pas, chacun
// séparé du suivant d’assez pour se voir.

export const tokens = {
  surface: {
    /** Le seul gris de fond : le canvas de l’application, la scène d’aperçu. */
    canvas: '#f5f5f5',
    card: '#ffffff',
    /** Le creux d’une carte posée dans une autre, et l’en-tête d’un tableau. */
    raised: '#fafafa',
    /**
     * L’aplat de ce que le client est en train de modifier, et le surlignage
     * d’un texte sélectionné. C’est la seule marque de la sélection, dans tout
     * le panel : ni chevron, ni bâtonnet, ni coche — un aplat et un cran de
     * graisse, partout pareil. Il se tient donc entre deux bornes : assez
     * franc pour se distinguer du survol, assez clair pour ne pas se lire
     * comme une ligne éteinte. Il ne porte que l’encre 1 et l’encre 2 :
     * l’encre 3 n’y tient que 4,2:1.
     */
    chosen: '#e8e8eb',
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
   * Les deux seules couleurs du panel, et elles disent toutes les deux quelque
   * chose. Le panel n’a pas de couleur d’identité : la sélection se donne par
   * le poids de son aplat et ce qui se mesure est noir, si bien qu’aucune
   * teinte n’entre jamais en concurrence avec le site que le client édite,
   * ouvert en aperçu au milieu de l’écran.
   */
  state: {
    /** Tout est enregistré, la section paraît. Toujours doublé du mot. */
    online: '#1a7f4b',
    /** Ce qui bloque l’enregistrement, et ce qui détruit. */
    refused: '#c0362c',
    refusedWash: '#fdf1f0',
    refusedLine: '#f6d9d6',
    /**
     * Ce qui mérite un regard sans rien empêcher. L’ambre se distingue du
     * rouge par ce qu’il autorise : on peut mettre en ligne avec, jamais
     * contre le rouge.
     */
    watch: '#8f5300',
    watchWash: '#fdf6ec',
    watchLine: '#f5e2c4',
  },

  /**
   * Le mouvement. Une seule courbe pour tout ce qui se pose — départ franc,
   * arrivée longue — et une durée choisie sur la distance parcourue. Sous
   * `prefers-reduced-motion`, il ne reste que l’attente qui tourne.
   */
  motion: {
    /** Une couleur qui change sous le curseur. */
    fast: '120ms',
    /** Ce qui se déplace : la pastille d’un interrupteur, un panneau. */
    base: '200ms',
    /** Ce qui paraît par-dessus la page. */
    slow: '260ms',
    /** Départ franc, arrivée longue : la courbe de ce qui se pose. */
    ease: 'cubic-bezier(0.2, 0, 0, 1)',
    /** L’aller-retour d’un même objet, sans arrivée privilégiée. */
    swing: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
    field: '10px',
    nested: '12px',
    surface: '16px',
    modal: '20px',
    pill: '999px',
    /** L’arrondi d’une barre de graphique : un dessin, pas une surface. */
    bar: '3px',
  },

  /**
   * L’échelle va du cheveu à la gouttière. Les deux derniers pas ne servent
   * jamais dans un objet : ils séparent des régions, et c’est par eux qu’un
   * écran respire.
   */
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
    /** Entre deux régions d’un même écran. */
    region: '32px',
    /** L’air entre le contenu et le bord de la fenêtre. */
    gutter: '48px',
  },

  /**
   * Cinq pas, et de vrais écarts entre eux. Quatre tailles séparées d’un pixel
   * ne font pas une hiérarchie : elles font une seule masse de petit gris. Un
   * écran en emploie trois.
   */
  text: {
    /** La méta, l’étiquette, l’en-tête d’une colonne, le contrôle compact. */
    eyebrow: '12px',
    body: '15px',
    /** Le titre d’une carte. */
    lead: '19px',
    /** Le titre de l’écran, et lui seul. */
    title: '28px',
    /** Le chiffre d’un indicateur. */
    display: '40px',
  },

  font: {
    sans: "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  /** Les hauteurs de contrôle, et rien entre elles. */
  control: {
    /** La micro-marque, qui tient dans la hauteur d’une ligne de liste. */
    mark: '22px',
    xs: '28px',
    sm: '32px',
    md: '38px',
    /** La ligne de liste. */
    row: '40px',
    /** La barre du haut. */
    bar: '60px',
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
    /**
     * La colonne de l’application. Au-delà, la fenêtre grandit mais le
     * contenu reste centré : une ligne qui court la fenêtre entière ne se lit
     * plus, et un écran collé à ses deux bords n’a plus de composition.
     */
    shell: '1600px',
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
