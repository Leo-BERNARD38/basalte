// Les valeurs du système du panel, dans un module pur.
//
// Le panel n’emprunte rien aux tokens du site (D65) : la direction artistique
// d’un client ne décide pas de la lisibilité de son outil de travail. Ce
// module est la seule source ; `panel.css` en pose les variables `--panel-*`
// et `src/admin/tokens.test.ts` vérifie que les deux disent la même chose.
// `basalte lint` le relit pour tenir le plancher de contraste (D164), et c’est
// pourquoi il n’importe rien : la commande est du Node.
//
// Le panel parle Material Design 3 (D194). Ses couleurs sont des rôles, et
// chaque rôle est un ton d’une palette tirée d’une graine : ce que ce module
// écrit en clair est le schéma de la graine neutre, en clair puis en sombre,
// et `scheme.test.ts` vérifie que c’est bien la sortie de `scheme.ts` — une
// valeur retouchée à la main s’y verrait. Un site qui déclare sa graine reçoit
// les mêmes rôles à ses couleurs, par une feuille inline (D199).
//
// Le reste est l’échelle de Material : la forme en sept rayons, le texte en
// douze tailles, l’élévation en cinq ombres posées sur des surfaces de plus
// en plus claires, le mouvement en trois durées et trois courbes, et les
// couches d’état qui disent le survol, le focus et l’appui par une même
// opacité posée sur la couleur du contenu.

export const tokens = {
  /**
   * Les rôles de couleur, dans les deux modes. La feuille pose le clair sur
   * `:root`, et le sombre sous `prefers-color-scheme: dark`.
   */
  color: {
    light: {
      primary: '#5e5e62',
      onPrimary: '#ffffff',
      primaryContainer: '#e2e2e7',
      onPrimaryContainer: '#1b1b1f',
      secondary: '#5e5e60',
      onSecondary: '#ffffff',
      secondaryContainer: '#e2e2e5',
      onSecondaryContainer: '#1b1b1d',
      tertiary: '#5e5e60',
      onTertiary: '#ffffff',
      tertiaryContainer: '#e2e2e5',
      onTertiaryContainer: '#1b1b1d',
      error: '#ac3131',
      onError: '#ffffff',
      errorContainer: '#ffdad6',
      onErrorContainer: '#410003',
      success: '#146d34',
      onSuccess: '#ffffff',
      successContainer: '#a3f5b4',
      onSuccessContainer: '#002108',
      warning: '#815500',
      onWarning: '#ffffff',
      warningContainer: '#ffddb0',
      onWarningContainer: '#2a1800',
      surface: '#f9f9fb',
      surfaceDim: '#dadadc',
      surfaceBright: '#f9f9fb',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerLow: '#f3f3f6',
      surfaceContainer: '#eeeef0',
      surfaceContainerHigh: '#e8e8ea',
      surfaceContainerHighest: '#e2e2e5',
      onSurface: '#1b1b1d',
      onSurfaceVariant: '#46464a',
      outline: '#77777b',
      outlineVariant: '#c6c6cb',
      inverseSurface: '#303032',
      inverseOnSurface: '#f0f0f3',
      inversePrimary: '#c6c6cb',
      scrim: '#000000',
      shadow: '#000000',
    },
    dark: {
      primary: '#c6c6cb',
      onPrimary: '#303034',
      primaryContainer: '#46464a',
      onPrimaryContainer: '#e2e2e7',
      secondary: '#c6c6c8',
      onSecondary: '#303032',
      secondaryContainer: '#464648',
      onSecondaryContainer: '#e2e2e5',
      tertiary: '#c6c6c8',
      onTertiary: '#303032',
      tertiaryContainer: '#464648',
      onTertiaryContainer: '#e2e2e5',
      error: '#ffb3ad',
      onError: '#68000a',
      errorContainer: '#8f0e19',
      onErrorContainer: '#ffdad6',
      success: '#87d899',
      onSuccess: '#003915',
      successContainer: '#005322',
      onSuccessContainer: '#a3f5b4',
      warning: '#f6bc6a',
      onWarning: '#452b00',
      warningContainer: '#624000',
      onWarningContainer: '#ffddb0',
      surface: '#131315',
      surfaceDim: '#131315',
      surfaceBright: '#39393b',
      surfaceContainerLowest: '#0e0e10',
      surfaceContainerLow: '#1b1b1d',
      surfaceContainer: '#1f1f21',
      surfaceContainerHigh: '#2a2a2b',
      surfaceContainerHighest: '#353536',
      onSurface: '#e2e2e5',
      onSurfaceVariant: '#c6c6cb',
      outline: '#909095',
      outlineVariant: '#46464a',
      inverseSurface: '#e2e2e5',
      inverseOnSurface: '#303032',
      inversePrimary: '#5e5e62',
      scrim: '#000000',
      shadow: '#000000',
    },
  },

  /** L’opacité d’une couche d’état, posée sur la couleur du contenu. */
  state: {
    hover: '8%',
    focus: '10%',
    pressed: '10%',
    drag: '16%',
    /** Le contenu d’un contrôle éteint, et son fond. */
    disabledContent: '38%',
    disabledContainer: '12%',
  },

  motion: {
    short: '100ms',
    medium: '250ms',
    long: '400ms',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },

  /**
   * Les cinq niveaux d’ombre de Material. Une surface s’élève d’abord par sa
   * couleur — un conteneur plus clair —, l’ombre ne vient qu’à ce qui se
   * détache vraiment : une carte élevée, un menu, une fenêtre, un bouton
   * flottant.
   */
  elevation: {
    1: '0 1px 2px rgb(0 0 0 / 30%), 0 1px 3px 1px rgb(0 0 0 / 15%)',
    2: '0 1px 2px rgb(0 0 0 / 30%), 0 2px 6px 2px rgb(0 0 0 / 15%)',
    3: '0 1px 3px rgb(0 0 0 / 30%), 0 4px 8px 3px rgb(0 0 0 / 15%)',
    4: '0 2px 3px rgb(0 0 0 / 30%), 0 6px 10px 4px rgb(0 0 0 / 15%)',
    5: '0 4px 4px rgb(0 0 0 / 30%), 0 8px 12px 6px rgb(0 0 0 / 15%)',
  },

  scrim: 'rgb(0 0 0 / 32%)',

  /**
   * Les hachures à 45° : un pixel tous les six, sur la couleur du contenu
   * pour qu’elles s’inversent avec le mode. Elles marquent ce qui n’existe
   * pas encore sur le site — un brouillon, une section masquée, un
   * emplacement vide.
   */
  hatch:
    'repeating-linear-gradient(45deg, color-mix(in srgb, currentColor 12%, transparent) 0 1px, transparent 1px 6px)',

  /** L’échelle de forme de Material, du carré au plein. */
  radius: {
    none: '0',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '28px',
    full: '999px',
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
    region: '32px',
    gutter: '48px',
  },

  /**
   * Les tailles de l’échelle de type : un cran sous celles de Material pour
   * les grands styles, les siennes pour le corps et les étiquettes (D216). Le
   * panel est un outil de bureau, mais un outil qu’on lit : le corps à
   * treize pixels ne se lisait pas. La graisse, l’interligne et l’approche de
   * chaque style vivent dans la feuille : seule la taille est un token, parce
   * que c’est elle que le lint contrôle.
   */
  text: {
    labelSm: '12px',
    labelMd: '13px',
    labelLg: '14px',
    bodySm: '13px',
    bodyMd: '14px',
    bodyLg: '15px',
    titleSm: '14px',
    titleMd: '16px',
    titleLg: '18px',
    headlineSm: '22px',
    headlineMd: '26px',
    displaySm: '30px',
    displayMd: '36px',
    displayLg: '45px',
  },

  font: {
    sans: "'Roboto Flex', Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  control: {
    mark: '20px',
    xs: '26px',
    sm: '30px',
    chip: '30px',
    md: '36px',
    field: '40px',
    row: '40px',
    touch: '44px',
    fab: '48px',
    bar: '60px',
    rail: '72px',
  },

  width: {
    form: '400px',
    page: '860px',
    /** La colonne où l’on écrit, et le panneau d’une médiathèque. */
    aside: '400px',
    menu: '300px',
    modal: '960px',
    snackbar: '560px',
    phone: '414px',
    /**
     * La largeur à laquelle le rendu bureau est demandé, avant réduction :
     * celle d’un petit écran de bureau, où la mise en page est déjà celle du
     * bureau — plus large, la réduction rendait le texte illisible pour rien.
     */
    desktop: '1024px',
    shell: '1600px',
  },
} as const

export type PanelTokens = typeof tokens
