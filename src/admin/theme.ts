// La couche de tokens du panel : surfaces, encre, couleurs, échelle de texte,
// espacements, rayons, ombres. Déclarée une fois ici, elle alimente le thème
// Mantine et, par le résolveur de variables, les classes de `panel.css`.
//
// Le panel n’emprunte rien aux tokens du site (D65) : la direction artistique
// d’un client ne décide pas de la lisibilité de son outil de travail. On
// configure l’échelle de Mantine plutôt que de la subir — c’est ce qui permet
// aux composants de la bibliothèque et aux classes maison de tomber sur les
// mêmes valeurs.
//
// Deux principes portent l’allure : aucune bordure, et la couleur réservée aux
// actions et aux données. Ce qui sépare deux plans est un écart de valeur et
// une ombre très douce.

import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  createTheme,
  Fieldset,
  Modal,
  NavLink,
  Paper,
  PasswordInput,
  Select,
  Switch,
  Tabs,
  Textarea,
  TextInput,
  type CSSVariablesResolver,
} from '@mantine/core'

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif'
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'

/**
 * Les valeurs du système, hors de l’objet Mantine pour qu’un test puisse les
 * lire et que `panel.css` les retrouve sous `--panel-*`.
 */
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
    3: '#71757f',
    4: '#9ea3af',
  },
  accent: {
    blue: '#1266d6',
    blueMark: '#1b7cf2',
    green: '#12864f',
    orange: '#c2410c',
    red: '#b42318',
  },
  radius: {
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
  shadow: {
    sm: '0 1px 2px rgba(20, 24, 35, .06), 0 4px 10px -6px rgba(20, 24, 35, .10)',
    card: '0 1px 2px rgba(20, 24, 35, .05), 0 12px 28px -14px rgba(20, 24, 35, .13)',
    pop: '0 4px 10px rgba(20, 24, 35, .07), 0 20px 44px -16px rgba(20, 24, 35, .24)',
  },
} as const

/**
 * Les gammes de dix pas qu’attend Mantine. Le pas 6 porte la valeur du système
 * — c’est celui que la variante pleine et l’anneau de focus emploient.
 *
 * `ink` n’existe que pour l’action principale, noire : ses pas clairs ne sont
 * jamais lus.
 */
const brand: MantineColorTuple = [
  '#edf3fd',
  '#d8e5fa',
  '#aec8f4',
  '#81a9ee',
  '#5c90e9',
  '#4581e6',
  tokens.accent.blue,
  '#0f59bd',
  '#0c4da5',
  '#08408c',
]

const ink: MantineColorTuple = [
  '#f3f4f6',
  '#e3e4e8',
  '#c5c7cd',
  '#a3a6b0',
  '#7f838f',
  '#5a5e6b',
  tokens.surface.ink,
  '#121419',
  '#0e1014',
  '#0a0c0f',
]

// Le gris froid du système. Mantine y prend son texte estompé (pas 6) et ses
// fonds en creux (pas 0 et 1) : régler cette gamme suffit à teinter tout ce que
// la bibliothèque dessine.
const gray: MantineColorTuple = [
  tokens.surface.hover,
  tokens.surface.sunken,
  '#e3e7ef',
  '#d3d8e2',
  '#b9bfcd',
  tokens.ink[4],
  tokens.ink[3],
  tokens.ink[2],
  '#3b3e46',
  tokens.ink[1],
]

const red: MantineColorTuple = [
  '#fdeeec',
  '#fbdcd8',
  '#f5b5ae',
  '#ee8b81',
  '#e7695c',
  '#e35443',
  tokens.accent.red,
  '#a01f15',
  '#8c1b12',
  '#78170f',
]

const green: MantineColorTuple = [
  '#e9f6ef',
  '#d3ecdf',
  '#a5d9c0',
  '#74c69e',
  '#4db582',
  '#33aa70',
  tokens.accent.green,
  '#0f7645',
  '#0c653b',
  '#095431',
]

const orange: MantineColorTuple = [
  '#fdf0e9',
  '#fbdfd1',
  '#f6bda3',
  '#f19871',
  '#ed7a49',
  '#eb672f',
  tokens.accent.orange,
  '#ad3a0a',
  '#983208',
  '#832b07',
]

type MantineColorTuple = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  black: tokens.ink[1],
  white: tokens.surface.card,
  colors: { brand, ink, gray, red, green, orange },

  fontFamily: SANS,
  fontFamilyMonospace: MONO,
  fontSizes: {
    xs: tokens.text.eyebrow,
    sm: tokens.text.cap,
    md: tokens.text.body,
    lg: tokens.text.lead,
    xl: tokens.text.title,
  },
  lineHeights: { xs: '1.4', sm: '1.5', md: '1.45', lg: '1.5', xl: '1.25' },
  headings: {
    fontFamily: SANS,
    fontWeight: '700',
    sizes: {
      h1: { fontSize: tokens.text.display, lineHeight: '1.05' },
      h2: { fontSize: '28px', lineHeight: '1.15' },
      h3: { fontSize: tokens.text.title, lineHeight: '1.2' },
      h4: { fontSize: '17px', lineHeight: '1.3' },
      h5: { fontSize: '15px', lineHeight: '1.35' },
      h6: { fontSize: tokens.text.cap, lineHeight: '1.4' },
    },
  },

  defaultRadius: 'md',
  radius: {
    xs: '8px',
    sm: tokens.radius.sm,
    md: tokens.radius.md,
    lg: tokens.radius.lg,
    xl: tokens.radius.pill,
  },
  spacing: {
    xs: tokens.space[2],
    sm: tokens.space[3],
    md: tokens.space[4],
    lg: tokens.space[5],
    xl: tokens.space[6],
  },
  shadows: {
    xs: tokens.shadow.sm,
    sm: tokens.shadow.card,
    md: tokens.shadow.card,
    lg: tokens.shadow.pop,
    xl: tokens.shadow.pop,
  },

  focusRing: 'auto',
  cursorType: 'pointer',
  other: tokens,

  components: {
    // Tout ce qui se clique est une pilule. Le noir plein est réservé à
    // l’action qui change l’état du site, une seule fois par écran.
    Button: Button.extend({
      defaultProps: { radius: 'xl', size: 'md' },
      styles: { root: { fontWeight: 600 } },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { radius: 'xl', variant: 'subtle', color: 'gray' },
    }),

    // Une carte se détache par sa valeur et son ombre, jamais par un trait :
    // `withBorder` reste sans effet visible.
    Paper: Paper.extend({
      defaultProps: { radius: 'lg', shadow: 'sm', withBorder: false },
      styles: { root: { borderWidth: 0 } },
    }),

    // Un champ est un creux, pas un contour. Le focus est un anneau.
    TextInput: TextInput.extend({
      defaultProps: { variant: 'filled', radius: 'md', size: 'md' },
    }),
    Textarea: Textarea.extend({
      defaultProps: { variant: 'filled', radius: 'md', size: 'md' },
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: { variant: 'filled', radius: 'md', size: 'md' },
    }),
    Select: Select.extend({
      defaultProps: { variant: 'filled', radius: 'md', size: 'md' },
    }),
    Fieldset: Fieldset.extend({
      defaultProps: { variant: 'filled', radius: 'md' },
    }),

    Badge: Badge.extend({
      defaultProps: { radius: 'xl', variant: 'light', size: 'lg' },
      styles: { label: { textTransform: 'none', fontWeight: 600 } },
    }),
    Switch: Switch.extend({
      defaultProps: { radius: 'xl', size: 'md', color: 'green' },
    }),
    Alert: Alert.extend({
      defaultProps: { radius: 'md', variant: 'light', p: 'sm' },
      styles: {
        title: { fontWeight: 700, marginBottom: 2 },
        message: { fontSize: tokens.text.cap },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        centered: true,
        shadow: 'xl',
        overlayProps: { backgroundOpacity: 0.4, blur: 2 },
      },
      styles: { title: { fontSize: tokens.text.title, fontWeight: 700 } },
    }),
    NavLink: NavLink.extend({
      defaultProps: { color: 'ink' },
      styles: { root: { borderRadius: tokens.radius.pill } },
    }),
    Accordion: Accordion.extend({
      defaultProps: { radius: 'lg', variant: 'filled' },
    }),
    Tabs: Tabs.extend({
      classNames: {
        list: 'basalte-tabs',
        tab: 'basalte-tab',
      },
    }),
  },
})

/**
 * Les tokens en variables CSS, pour les classes que Mantine ne dessine pas.
 * Une seule déclaration : `panel.css` n’a plus qu’à les consommer.
 */
export const cssVariables: CSSVariablesResolver = () => ({
  variables: {
    '--panel-bg': tokens.surface.bg,
    '--panel-surface': tokens.surface.card,
    '--panel-sunken': tokens.surface.sunken,
    '--panel-hover': tokens.surface.hover,
    '--panel-ink-card': tokens.surface.ink,
    '--panel-ink': tokens.ink[1],
    '--panel-ink-2': tokens.ink[2],
    '--panel-ink-3': tokens.ink[3],
    '--panel-ink-4': tokens.ink[4],
    '--panel-blue': tokens.accent.blue,
    '--panel-blue-mark': tokens.accent.blueMark,
    '--panel-green': tokens.accent.green,
    '--panel-orange': tokens.accent.orange,
    '--panel-red': tokens.accent.red,
    '--panel-radius-sm': tokens.radius.sm,
    '--panel-radius-md': tokens.radius.md,
    '--panel-radius-lg': tokens.radius.lg,
    '--panel-pill': tokens.radius.pill,
    '--panel-space-1': tokens.space[1],
    '--panel-space-2': tokens.space[2],
    '--panel-space-3': tokens.space[3],
    '--panel-space-4': tokens.space[4],
    '--panel-space-5': tokens.space[5],
    '--panel-space-6': tokens.space[6],
    '--panel-space-7': tokens.space[7],
    '--panel-text-eyebrow': tokens.text.eyebrow,
    '--panel-text-cap': tokens.text.cap,
    '--panel-text-body': tokens.text.body,
    '--panel-text-lead': tokens.text.lead,
    '--panel-text-title': tokens.text.title,
    '--panel-text-display': tokens.text.display,
    '--panel-control-sm': tokens.control.sm,
    '--panel-control-md': tokens.control.md,
    '--panel-control-touch': tokens.control.touch,
    '--panel-shadow-sm': tokens.shadow.sm,
    '--panel-shadow-card': tokens.shadow.card,
    '--panel-shadow-pop': tokens.shadow.pop,
  },
  light: {},
  dark: {},
})
