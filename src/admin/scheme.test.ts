import { describe, expect, it } from 'vitest'

import { contrast } from '../lint/contrast.js'
import { schemePairs } from '../lint/panel.js'
import { NEUTRAL_SEED, ROLES, scheme, schemeCss, tone } from './scheme.js'
import { tokens } from './tokens.js'

/** Quarante graines réparties sur le cercle, à trois chromas. */
const SEEDS = [
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#000000',
  '#ffffff',
  '#808080',
  '#2f5bea',
  ...Array.from({ length: 30 }, (_, rank) => {
    const hue = (rank * 12) % 360
    const saturation = [0.35, 0.7, 1][rank % 3] ?? 1
    const lightness = [0.3, 0.5, 0.7][Math.floor(rank / 10)] ?? 0.5

    return hsl(hue, saturation, lightness)
  }),
]

function hsl(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const base = lightness - chroma / 2
  const [red, green, blue] =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second]

  return `#${[red, green, blue]
    .map((part) =>
      Math.round((part + base) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

describe('le schéma tiré d’une graine', () => {
  it('donne le noir et le blanc exacts aux deux bouts de l’échelle', () => {
    expect(tone(250, 0.15, 0)).toBe('#000000')
    expect(tone(250, 0.15, 100)).toBe('#ffffff')
  })

  it('porte tous les rôles, en hexadécimal court', () => {
    for (const mode of ['light', 'dark'] as const) {
      const colours = scheme('#2f5bea', mode)

      for (const role of ROLES) {
        expect(colours[role]).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  // C’est ce qui fait que les valeurs de `tokens.ts` sont vérifiées et non
  // seulement écrites : elles sont la sortie du générateur pour la graine
  // neutre, et une retouche à la main s’y verrait.
  it('est ce que les tokens du panel écrivent, pour la graine neutre', () => {
    expect(tokens.color.light).toEqual(scheme(NEUTRAL_SEED, 'light'))
    expect(tokens.color.dark).toEqual(scheme(NEUTRAL_SEED, 'dark'))
  })

  it('tient le plancher de contraste pour toute graine, dans les deux modes', () => {
    const failing: string[] = []

    for (const seed of SEEDS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const pair of schemePairs(scheme(seed, mode), mode)) {
          const measured = contrast(pair.frontValue, pair.backValue) ?? 0

          if (measured < pair.ratio) {
            failing.push(
              `${seed} ${pair.front} sur ${pair.back} : ${measured.toFixed(2)}`,
            )
          }
        }
      }
    }

    expect(failing).toEqual([])
  })

  it('reste gris pour une graine grise, coloré pour une couleur', () => {
    const grey = scheme(NEUTRAL_SEED, 'light')
    const blue = scheme('#2f5bea', 'light')

    expect(spread(grey.primary)).toBeLessThan(8)
    expect(spread(blue.primary)).toBeGreaterThan(80)
  })

  it('écrit la feuille d’une graine sous l’attribut, en clair puis en sombre', () => {
    const css = schemeCss('#2f5bea')

    expect(css.startsWith(':root[data-seed]{--panel-color-primary:#')).toBe(
      true,
    )
    expect(css).toContain(
      '@media (prefers-color-scheme: dark){:root[data-seed]{',
    )
    expect(css).toContain('--panel-color-surface-container-highest:#')
  })
})

/** L’écart entre le canal le plus fort et le plus faible : nul pour un gris. */
function spread(hex: string): number {
  const channels = [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16),
  )

  return Math.max(...channels) - Math.min(...channels)
}
