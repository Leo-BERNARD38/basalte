// Le thème Mantine du panel, tiré des valeurs de `tokens.ts`.
//
// Le panel n’emprunte rien aux tokens du site (D65). On configure l’échelle de
// Mantine plutôt que de la subir — c’est ce qui permet aux composants de la
// bibliothèque et aux classes maison de tomber sur les mêmes valeurs. Les
// valeurs elles-mêmes vivent à côté, dans un module que `basalte lint` peut
// relire sans entraîner `@mantine/core` (D164).
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
  Paper,
  PasswordInput,
  Select,
  Switch,
  Tabs,
  Textarea,
  TextInput,
  type CSSVariablesResolver,
} from '@mantine/core'

import { tokens } from './tokens.js'

export { tokens }

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif'
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'

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

// Le gris froid du système. Mantine y prend son texte estompé (pas 6), son
// texte d’invite et ses états inertes (pas 5), et ses fonds en creux (pas 0 et
// 1) : régler cette gamme suffit à teinter tout ce que la bibliothèque dessine.
//
// Les pas 5 et 6 portent la même encre, et c’est voulu : une invite se lit
// autant qu’un texte estompé, et l’encre du panel n’a que trois niveaux
// lisibles.

const gray: MantineColorTuple = [
  tokens.surface.hover,
  tokens.surface.sunken,
  '#e3e7ef',
  '#d3d8e2',
  '#b9bfcd',
  tokens.ink[3],
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
  // Les six rangs tombent sur les six pas de l’échelle, et sur rien d’autre :
  // Mantine en proposait trois — 28, 17 et 15 — qu’aucun token ne porte, et
  // c’est par eux que les titres du panel s’écrivaient chacun à leur façon.
  //
  // Le panel s’en sert sur trois rangs : le nom de l’écran, celui d’une colonne,
  // celui d’une carte.
  headings: {
    fontFamily: SANS,
    fontWeight: '700',
    sizes: {
      h1: { fontSize: tokens.text.display, lineHeight: '1.05' },
      h2: { fontSize: tokens.text.title, lineHeight: '1.2' },
      h3: { fontSize: tokens.text.lead, lineHeight: '1.3' },
      h4: { fontSize: tokens.text.body, lineHeight: '1.35' },
      h5: { fontSize: tokens.text.cap, lineHeight: '1.4' },
      h6: { fontSize: tokens.text.eyebrow, lineHeight: '1.4' },
    },
  },

  defaultRadius: 'md',
  radius: {
    xs: tokens.radius.xs,
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
    '--panel-line': tokens.line,
    '--panel-scrim': tokens.scrim,
    '--panel-blue': tokens.accent.blue,
    '--panel-blue-mark': tokens.accent.blueMark,
    '--panel-green': tokens.accent.green,
    '--panel-orange': tokens.accent.orange,
    '--panel-red': tokens.accent.red,
    '--panel-red-wash': tokens.redWash,
    '--panel-radius-xs': tokens.radius.xs,
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
    '--panel-measure-form': tokens.measure.form,
    '--panel-measure-page': tokens.measure.page,
    '--panel-shadow-sm': tokens.shadow.sm,
    '--panel-shadow-card': tokens.shadow.card,
    '--panel-shadow-pop': tokens.shadow.pop,
  },
  light: {},
  dark: {},
})
