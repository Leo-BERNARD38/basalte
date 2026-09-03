// Le schéma de couleurs du panel, tiré d’une seule graine (D195).
//
// Material Design 3 dérive toutes ses couleurs d’une couleur de départ : six
// palettes tonales en sortent — la principale, la secondaire, la tertiaire,
// deux neutres et l’erreur —, et chaque rôle de l’interface est un ton fixe
// de l’une d’elles. Le panel y ajoute deux palettes que Material n’a pas et
// dont il a besoin : le vert qui dit « en ligne » et l’ambre qui demande un
// regard.
//
// La teinte et le chroma se lisent en OKLCH ; le ton, lui, est la clarté L*
// de CIELAB (D196). C’est elle qui porte la garantie de Material : deux tons
// séparés de quarante se lisent à 3:1, de cinquante à 4,5:1, quelle que soit
// la graine — et c’est ce que `basalte lint` mesure ensuite. Porter HCT en
// entier aurait coûté six cents lignes pour une propriété qui ne tient qu’à
// L*.
//
// Le module n’importe rien : `admin.astro` le lit côté serveur, les tests et
// le lint depuis Node, et rien du panel ne le charge — la feuille pose les
// valeurs neutres, la graine d’un site arrive en `<style>` inline.

export type Mode = 'light' | 'dark'

/** La graine du schéma neutre : l’encre grise du panel, presque sans chroma. */
export const NEUTRAL_SEED = '#5c5c60'

export const ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'success',
  'onSuccess',
  'successContainer',
  'onSuccessContainer',
  'warning',
  'onWarning',
  'warningContainer',
  'onWarningContainer',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
  'scrim',
  'shadow',
] as const

export type Role = (typeof ROLES)[number]

export type Scheme = Readonly<Record<Role, string>>

type Palette = { readonly hue: number; readonly chroma: number }

type Palettes = {
  readonly primary: Palette
  readonly secondary: Palette
  readonly tertiary: Palette
  readonly neutral: Palette
  readonly neutralVariant: Palette
  readonly error: Palette
  readonly success: Palette
  readonly warning: Palette
}

/** Sous ce chroma, une graine est grise, et tout le schéma le reste. */
const NEUTRAL_CHROMA = 0.02

/**
 * Les palettes que la graine engendre. Le chroma de la principale est borné
 * pour qu’un bleu délavé donne quand même un bouton qui se voit et qu’un rouge
 * pur ne brûle pas ; les autres en sont des fractions fixes, comme chez
 * Material. Une graine grise garde tout gris : les bornes ne s’appliquent
 * qu’à une couleur qui en est une.
 */
function palettes(seed: string): Palettes {
  const [, chroma, hue] = toLch(seed)
  const grey = chroma < NEUTRAL_CHROMA

  return {
    primary: {
      hue,
      chroma: grey ? Math.min(chroma, 0.012) : clamp(chroma, 0.09, 0.15),
    },
    secondary: { hue, chroma: grey ? chroma / 2 : 0.045 },
    tertiary: { hue: grey ? hue : hue + 60, chroma: grey ? chroma / 2 : 0.075 },
    neutral: { hue, chroma: grey ? chroma / 2 : 0.01 },
    neutralVariant: { hue, chroma: grey ? chroma : 0.02 },
    error: { hue: harmonize(25, hue, grey), chroma: 0.16 },
    success: { hue: harmonize(150, hue, grey), chroma: 0.12 },
    warning: { hue: harmonize(75, hue, grey), chroma: 0.12 },
  }
}

/** Rapproche une teinte fixe de celle de la graine, de quinze degrés au plus. */
function harmonize(fixed: number, toward: number, grey: boolean): number {
  if (grey) return fixed

  const delta = ((toward - fixed + 540) % 360) - 180

  return fixed + Math.sign(delta) * Math.min(Math.abs(delta), 15)
}

/**
 * Le ton de chaque rôle, en clair puis en sombre — la table de Material, à
 * laquelle s’ajoutent les deux palettes du panel sur le même patron que
 * l’erreur.
 */
const TONES: Readonly<Record<Role, readonly [keyof Palettes, number, number]>> =
  {
    primary: ['primary', 40, 80],
    onPrimary: ['primary', 100, 20],
    primaryContainer: ['primary', 90, 30],
    onPrimaryContainer: ['primary', 10, 90],
    secondary: ['secondary', 40, 80],
    onSecondary: ['secondary', 100, 20],
    secondaryContainer: ['secondary', 90, 30],
    onSecondaryContainer: ['secondary', 10, 90],
    tertiary: ['tertiary', 40, 80],
    onTertiary: ['tertiary', 100, 20],
    tertiaryContainer: ['tertiary', 90, 30],
    onTertiaryContainer: ['tertiary', 10, 90],
    error: ['error', 40, 80],
    onError: ['error', 100, 20],
    errorContainer: ['error', 90, 30],
    onErrorContainer: ['error', 10, 90],
    success: ['success', 40, 80],
    onSuccess: ['success', 100, 20],
    successContainer: ['success', 90, 30],
    onSuccessContainer: ['success', 10, 90],
    warning: ['warning', 40, 80],
    onWarning: ['warning', 100, 20],
    warningContainer: ['warning', 90, 30],
    onWarningContainer: ['warning', 10, 90],
    surface: ['neutral', 98, 6],
    surfaceDim: ['neutral', 87, 6],
    surfaceBright: ['neutral', 98, 24],
    surfaceContainerLowest: ['neutral', 100, 4],
    surfaceContainerLow: ['neutral', 96, 10],
    surfaceContainer: ['neutral', 94, 12],
    surfaceContainerHigh: ['neutral', 92, 17],
    surfaceContainerHighest: ['neutral', 90, 22],
    onSurface: ['neutral', 10, 90],
    onSurfaceVariant: ['neutralVariant', 30, 80],
    outline: ['neutralVariant', 50, 60],
    outlineVariant: ['neutralVariant', 80, 30],
    inverseSurface: ['neutral', 20, 90],
    inverseOnSurface: ['neutral', 95, 20],
    inversePrimary: ['primary', 80, 40],
    scrim: ['neutral', 0, 0],
    shadow: ['neutral', 0, 0],
  }

/** Tous les rôles du schéma, pour une graine et un mode. */
export function scheme(seed: string, mode: Mode): Scheme {
  const source = palettes(seed)
  const result: Partial<Record<Role, string>> = {}

  for (const role of ROLES) {
    const [name, light, dark] = TONES[role]
    const palette = source[name]

    result[role] = tone(
      palette.hue,
      palette.chroma,
      mode === 'light' ? light : dark,
    )
  }

  return result as Scheme
}

/**
 * La feuille qui pose le schéma d’une graine par-dessus le neutre de
 * `panel.css`. Le sélecteur porte l’attribut exprès : l’ordre des feuilles
 * dans `<head>` diffère entre le développement et le build, et une
 * spécificité plus haute gagne dans les deux (D199).
 */
export function schemeCss(seed: string): string {
  const declare = (mode: Mode): string =>
    Object.entries(scheme(seed, mode))
      .map(([role, value]) => `--panel-color-${kebab(role)}:${value}`)
      .join(';')

  return `:root[data-seed]{${declare('light')}}@media (prefers-color-scheme: dark){:root[data-seed]{${declare('dark')}}}`
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * La couleur d’un ton, pour une teinte et un chroma. Le ton est L* : la
 * luminance qu’il désigne est cherchée sur la clarté OKLab, et le chroma
 * descend juste assez pour que la couleur tienne dans sRGB.
 */
export function tone(hue: number, chroma: number, value: number): string {
  if (value <= 0) return '#000000'
  if (value >= 100) return '#ffffff'

  const target = luminanceOf(value)
  let low = 0
  let high = 1

  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    const [, , , luminance] = fit(middle, chroma, hue)

    if (luminance < target) low = middle
    else high = middle
  }

  const [red, green, blue] = fit((low + high) / 2, chroma, hue)

  return `#${channel(red)}${channel(green)}${channel(blue)}`
}

/** La luminance relative d’une clarté L*. */
function luminanceOf(lightness: number): number {
  return lightness <= 8 ? lightness / 903.2963 : ((lightness + 16) / 116) ** 3
}

/**
 * Les trois canaux linéaires d’une couleur OKLCH ramenée dans sRGB, et leur
 * luminance. Le chroma est réduit par dichotomie jusqu’à ce que la couleur
 * tienne : la clarté ne bouge pas, donc le ton non plus.
 */
function fit(
  lightness: number,
  chroma: number,
  hue: number,
): readonly [number, number, number, number] {
  let inside = toLinear(lightness, 0, hue)
  let low = 0
  let high = chroma

  if (within(toLinear(lightness, chroma, hue))) {
    inside = toLinear(lightness, chroma, hue)
  } else {
    for (let step = 0; step < 16; step += 1) {
      const middle = (low + high) / 2
      const candidate = toLinear(lightness, middle, hue)

      if (within(candidate)) {
        low = middle
        inside = candidate
      } else {
        high = middle
      }
    }
  }

  const [red, green, blue] = inside.map((part) => clamp(part, 0, 1))

  return [
    red ?? 0,
    green ?? 0,
    blue ?? 0,
    0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0),
  ]
}

function within(channels: readonly number[]): boolean {
  return channels.every((part) => part >= -0.0005 && part <= 1.0005)
}

/** OKLCH vers sRGB linéaire, sans rien borner. */
function toLinear(
  lightness: number,
  chroma: number,
  hue: number,
): readonly number[] {
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** La clarté, le chroma et la teinte OKLCH d’un « #rrggbb ». */
function toLch(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  const [red, green, blue] = [16, 8, 0].map((shift) =>
    expand(((value >> shift) & 0xff) / 255),
  )

  const l = Math.cbrt(
    0.4122214708 * (red ?? 0) +
      0.5363325363 * (green ?? 0) +
      0.0514459929 * (blue ?? 0),
  )
  const m = Math.cbrt(
    0.2119034982 * (red ?? 0) +
      0.6806995451 * (green ?? 0) +
      0.1073969566 * (blue ?? 0),
  )
  const s = Math.cbrt(
    0.0883024619 * (red ?? 0) +
      0.2817188376 * (green ?? 0) +
      0.6299787005 * (blue ?? 0),
  )

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const chroma = Math.hypot(a, b)
  const hue =
    chroma < 1e-6 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360

  return [lightness, chroma, hue]
}

function expand(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function compress(channel: number): number {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055
}

function channel(linear: number): string {
  return Math.round(compress(linear) * 255)
    .toString(16)
    .padStart(2, '0')
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}
