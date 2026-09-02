// Les tokens de direction artistique, et leur passage en variables CSS. La
// liste est fermée : une famille ou un nom absents d’ici sont refusés, ce qui
// est ce qui rend tenable l’interdiction des valeurs de style en dur dans un
// bloc (docs/design.md).
//
// Les couleurs portent trois plans, et c’est ce qui donne son rythme à une page
// : « bg » le fond, « surface » le retrait qui sépare deux sections sans un
// trait, « contrast » le plan sombre. Le troisième existe pour lui-même, sans
// quoi un bandeau inversé détourne l’accent — et un site qui veut ce bandeau
// noir n’a plus d’accent nulle part.

const DEFAULTS = {
  color: {
    bg: '#ffffff',
    fg: '#16181d',
    muted: '#5c6270',
    accent: '#1f57ff',
    accentFg: '#ffffff',
    border: '#e2e5ea',
    danger: '#b42318',
    surface: '#f4f4f6',
    contrast: '#101014',
    contrastFg: '#ffffff',
  },
  font: {
    title: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  text: {
    xs: '0.8125rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.375rem',
    '2xl': '1.875rem',
    '3xl': '2.5rem',
    '4xl': '3.25rem',
    '5xl': '4rem',
  },
  space: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.5rem',
    6: '2rem',
    7: '3rem',
    8: '4.5rem',
    9: '6rem',
    10: '8rem',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.75rem',
  },
  width: {
    content: '42rem',
    wide: '72rem',
  },
} satisfies Record<string, Record<string, string>>

export type Tokens = {
  readonly [Family in keyof typeof DEFAULTS]: {
    readonly [Name in keyof (typeof DEFAULTS)[Family]]: string
  }
}

export type TokenOverrides = {
  readonly [Family in keyof Tokens]?: Partial<Tokens[Family]>
}

export function resolveTokens(overrides: TokenOverrides = {}): Tokens {
  const resolved = structuredClone(DEFAULTS) as Record<
    string,
    Record<string, string>
  >

  for (const [family, values] of Object.entries(overrides)) {
    const target = resolved[family]

    if (target === undefined) {
      throw new Error(
        `« ${family} » n’est pas une famille de tokens — les familles sont ${Object.keys(DEFAULTS).join(', ')}.`,
      )
    }

    for (const [name, value] of Object.entries(values ?? {})) {
      if (!(name in target)) {
        throw new Error(
          `« ${family}.${name} » n’est pas un token du socle. Un besoin non couvert s’ajoute au socle, jamais en valeur de style dans un bloc.`,
        )
      }

      target[name] = value
    }
  }

  return resolved as Tokens
}

export function tokensToCss(tokens: Tokens): string {
  const declarations: string[] = []

  for (const [family, values] of Object.entries(tokens)) {
    for (const [name, value] of Object.entries(values)) {
      declarations.push(`--${family}-${kebab(name)}:${value}`)
    }
  }

  return `:root{${declarations.join(';')}}`
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}
