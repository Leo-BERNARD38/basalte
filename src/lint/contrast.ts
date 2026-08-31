// Le plancher de `docs/design.md` : un texte et son fond se distinguent d’au
// moins 4,5:1. C’est la seule règle du plancher qu’une machine sait vérifier
// seule — les autres demandent de regarder l’écran.
//
// Elle se vérifie sur les tokens et non sur le rendu : une paire fautive y est
// fautive partout, et le dire à l’endroit où la valeur est écrite évite d’avoir
// à parcourir toutes les pages pour retrouver laquelle.

import type { Tokens } from '../site/tokens.js'
import { finding, type Finding } from './finding.js'

/** Le seuil de l’AA sur du texte courant. */
export const MINIMUM_RATIO = 4.5

/** Les paires qui se superposent vraiment dans les blocs du socle. */
const PAIRS: readonly {
  readonly front: keyof Tokens['color']
  readonly back: keyof Tokens['color']
  readonly what: string
}[] = [
  { front: 'fg', back: 'bg', what: 'le texte courant sur le fond' },
  { front: 'muted', back: 'bg', what: 'le texte secondaire sur le fond' },
  {
    front: 'accentFg',
    back: 'accent',
    what: 'le texte d’un bouton sur son fond',
  },
  { front: 'danger', back: 'bg', what: 'un message d’erreur sur le fond' },
]

export function contrastFindings(
  file: string,
  tokens: Tokens,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const pair of PAIRS) {
    const front = tokens.color[pair.front]
    const back = tokens.color[pair.back]
    const ratio = contrast(front, back)

    if (ratio === undefined || ratio >= MINIMUM_RATIO) continue

    findings.push(
      finding({
        file,
        line: 1,
        rule: 'design/contrast',
        message: `${pair.what} — « color.${pair.front} » sur « color.${pair.back} » ne donne que ${ratio.toFixed(1)}:1, il en faut ${MINIMUM_RATIO}.`,
        severity: 'error',
      }),
    )
  }

  return findings
}

/**
 * Le rapport de contraste des deux couleurs, ou `undefined` quand l’une n’est
 * pas lisible ici. Une couleur que ce module ne sait pas lire n’est pas une
 * faute : c’est une notation que le contrôle ne couvre pas, et une remarque
 * y serait un faux.
 */
export function contrast(front: string, back: string): number | undefined {
  const first = luminance(front)
  const second = luminance(back)

  if (first === undefined || second === undefined) return undefined

  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)

  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(colour: string): number | undefined {
  const channels = parse(colour)

  if (channels === undefined) return undefined

  const [red, green, blue] = channels.map(linear)

  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0)
}

/** Les trois canaux de 0 à 1, depuis « #rgb », « #rrggbb » ou « rgb(…) ». */
function parse(colour: string): readonly number[] | undefined {
  const value = colour.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)

  if (short !== null) {
    return short
      .slice(1, 4)
      .map((part) => Number.parseInt(part + part, 16) / 255)
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})[0-9a-f]{0,2}$/i.exec(
    value,
  )

  if (long !== null) {
    return long.slice(1, 4).map((part) => Number.parseInt(part, 16) / 255)
  }

  const functional = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(
    value,
  )

  if (functional !== null) {
    return functional.slice(1, 4).map((part) => Number.parseFloat(part) / 255)
  }

  return undefined
}

function linear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}
