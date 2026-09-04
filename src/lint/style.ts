// La règle que rien ne faisait respecter : aucune valeur de style en dur.
// Couleurs, espacements, typographies et rayons passent par un token, et un
// besoin non couvert est un token à ajouter au socle — jamais un
// « padding: 27px » isolé (docs/design.md).
//
// Deux systèmes de tokens vivent dans ce dépôt, et la règle vaut pour les deux
// (D164). Celui du site s'écrit dans le `<style>` d'un bloc : le frontmatter
// est du TypeScript et le corps du HTML, seule la feuille porte les valeurs que
// la règle vise. Celui du panel occupe une feuille entière et préfixe ses noms
// (D65) — il ne porte ni police ni largeur, et une propriété d'une famille
// qu'un système ne porte pas n'est pas contrôlée chez lui.
//
// Il tolère ce qu’aucun token ne peut porter : zéro, les proportions, les
// pourcentages, les unités de fenêtre, et les conditions de media query — une
// `@media` ne sait pas lire une variable CSS, si bien qu’un point de rupture
// s’y écrit en dur ou ne s’écrit pas.

import { finding, type Finding } from './finding.js'

/**
 * Les propriétés dont la valeur doit venir d’un token, et la famille visée.
 *
 * `width` n’y est pas, et `max-width` y est : les tokens de largeur sont des
 * largeurs de contenu, et c’est la seconde qui les porte. Une largeur tout
 * court mesure autre chose — un chevron dessiné, le piège d’un pot de miel —
 * qu’aucun token ne saurait donner.
 */
const TOKENISED: Readonly<Record<string, string>> = {
  padding: 'space',
  'padding-top': 'space',
  'padding-right': 'space',
  'padding-bottom': 'space',
  'padding-left': 'space',
  'padding-inline': 'space',
  'padding-block': 'space',
  margin: 'space',
  'margin-top': 'space',
  'margin-right': 'space',
  'margin-bottom': 'space',
  'margin-left': 'space',
  'margin-inline': 'space',
  'margin-block': 'space',
  gap: 'space',
  'row-gap': 'space',
  'column-gap': 'space',
  'font-size': 'text',
  'font-family': 'font',
  'border-radius': 'radius',
  'max-width': 'width',
}

const COLOUR_FUNCTIONS = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i
const HEX = /#[0-9a-f]{3,8}\b/i
const LENGTH = /(?:^|[\s(,])-?\d*\.?\d+(px|rem|em)\b/i

// Les noms que l’on écrit sans y penser. La liste n’a pas à être complète :
// elle attrape le geste, pas toutes ses variantes.
const NAMED =
  /\b(?:white|black|red|blue|green|grey|gray|silver|orange|yellow|purple|pink|brown|navy|teal|olive|maroon|lime|aqua|fuchsia)\b/i

// Les raccourcis y sont : « border: 1px solid #e2e5ea » porte une couleur
// autant que « border-color », et c’est sous cette forme qu’on l’écrit.
const COLOUR_PROPERTY =
  /^(?:color|background|background-color|background-image|border|border-(?:top|right|bottom|left|inline|block)|border(?:-[a-z]+)?-color|outline|outline-color|fill|stroke|box-shadow|text-shadow|text-decoration|text-decoration-color|accent-color|caret-color)$/

/** Ce qu’aucun token ne porte, et qui ne s’écrit donc pas autrement. */
const NEUTRAL =
  /^(?:0|auto|none|inherit|initial|unset|currentcolor|transparent)$/i

/**
 * Le système de tokens dans lequel une feuille se lit : où les valeurs vivent,
 * quelles familles ce système porte, et sous quel nom une correction se dit.
 */
export type StyleSystem = {
  /** Le préfixe des noms de tokens, tel qu’une correction les écrit. */
  readonly prefix: string
  /** Un token de couleur du système, cité en exemple. */
  readonly colour: string
  /** Les familles portées. Une propriété d’une autre échappe au contrôle. */
  readonly families: ReadonlySet<string>
  /** La feuille entière, ou le seul `<style>` d’un composant. */
  readonly whole: boolean
}

/** Les tokens de direction artistique, dans le `<style>` d’un bloc. */
export const SITE: StyleSystem = {
  prefix: '',
  colour: '--color-accent',
  families: new Set(['space', 'text', 'font', 'radius', 'width']),
  whole: false,
}

/**
 * Les tokens du panel, dans sa feuille. Elle porte tout ce que le panel
 * dessine, largeurs comprises. La police en est la seule famille non
 * contrôlée : un `@font-face` nomme forcément la sienne en clair, et la règle
 * refuserait la déclaration même qui la rend disponible.
 */
export const PANEL: StyleSystem = {
  prefix: 'panel-',
  colour: '--panel-color-on-surface',
  families: new Set(['space', 'text', 'radius', 'width']),
  whole: true,
}

export function hardcodedStyle(
  file: string,
  source: string,
  system: StyleSystem = SITE,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const [index, text] of styleLines(source, system.whole).entries()) {
    const declaration = declarationOf(text)

    if (declaration === undefined) continue

    const { property, value } = declaration
    const rest = withoutTokens(value)

    if (isColourProperty(property) && hasColour(rest)) {
      findings.push(
        finding({
          file,
          line: index + 1,
          rule: 'style/color',
          message: `« ${property}: ${value} » écrit une couleur en dur — emploie un token, « var(${system.colour}) ».`,
          severity: 'error',
        }),
      )

      continue
    }

    const family = TOKENISED[property]

    if (family === undefined || !system.families.has(family)) continue
    if (!literal(property, rest)) continue

    findings.push(
      finding({
        file,
        line: index + 1,
        rule: `style/${family}`,
        message: `« ${property}: ${value} » écrit une valeur en dur — emploie un token, « var(--${system.prefix}${family}-… ) ».`,
        severity: 'error',
      }),
    )
  }

  return findings
}

/**
 * Le fichier vidé de tout ce qui n’est pas du style, commentaires compris. Les
 * lignes gardent leur rang : une remarque doit désigner la ligne que l’on
 * ouvre, pas celle d’un extrait. Une feuille entière n’a rien à retrancher —
 * tout y est du style.
 */
function styleLines(source: string, whole: boolean): readonly string[] {
  const lines = withoutComments(source).split(/\r?\n/)

  if (whole) return lines

  let inside = false

  return lines.map((text) => {
    const opens = /<style[\s>]/i.test(text)
    const closes = /<\/style>/i.test(text)
    const kept = inside && !opens && !closes ? text : ''

    if (opens) inside = true
    if (closes) inside = false

    return kept
  })
}

/**
 * Les commentaires blanchis, leurs retours à la ligne gardés. Une phrase de
 * prose porte des deux-points et des points-virgules : sans cela, celle qui
 * s’ouvre par un mot suivi d’un deux-points passerait pour une déclaration.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  )
}

function declarationOf(
  text: string,
): { readonly property: string; readonly value: string } | undefined {
  // Une condition de media query porte des deux-points sans être une
  // déclaration, et aucune variable CSS n’y est lisible.
  if (/^\s*@/.test(text)) return undefined

  const match = /^\s*([a-z-]+)\s*:\s*([^;]+);/.exec(text)

  if (match?.[1] === undefined || match[2] === undefined) return undefined

  // Une custom property est une définition de token, pas son emploi.
  if (match[1].startsWith('--')) return undefined

  return { property: match[1].toLowerCase(), value: match[2].trim() }
}

/** La valeur privée de ses `var(--…)`, dont le repli reste inspecté. */
function withoutTokens(value: string): string {
  return value.replace(/var\(\s*--[a-z0-9-]+\s*/gi, '(')
}

function isColourProperty(property: string): boolean {
  return COLOUR_PROPERTY.test(property)
}

function hasColour(value: string): boolean {
  return HEX.test(value) || COLOUR_FUNCTIONS.test(value) || NAMED.test(value)
}

function literal(property: string, value: string): boolean {
  const trimmed = value.trim()

  if (NEUTRAL.test(trimmed)) return false

  // Une police n’a pas d’unité : ce qui n’est pas un token en est une écrite
  // en clair, dès qu’il reste autre chose que des parenthèses de repli.
  if (property === 'font-family') return /[a-z"']/i.test(trimmed)

  return LENGTH.test(trimmed)
}
