// L’apparence du panel, choisie par appareil : le mode, et la graine (D208).
//
// Le panel suit le système par défaut (D197) et porte la graine de son site
// (D195). Ce module tient ce qu’un client règle par-dessus, dans « Compte » :
// un mode forcé — clair ou sombre quel que soit l’écran —, et une graine à
// lui. Le réglage vit dans le navigateur, pas sur le serveur : c’est un
// confort d’appareil, comme la taille d’une police, et il doit s’appliquer
// avant que l’island monte, faute de quoi le panel clignote du schéma du site
// au schéma choisi à chaque ouverture.
//
// C’est pourquoi ce qui est rangé n’est pas seulement la préférence, mais
// les deux schémas déjà calculés, sous le nom que la feuille leur donne : le
// script d’amorçage — `BOOT`, émis inline par `admin.astro` — n’a qu’à lire,
// choisir le mode, et poser les variables sur `<html>`. Il ne recalcule
// rien, et n’embarque donc pas le générateur.
//
// Un module pur : l’island l’importe, `admin.astro` aussi, et rien de
// `src/server/` n’y entre (`island.test.ts`).

import {
  NEUTRAL_SEED,
  ROLES,
  scheme,
  type Mode,
  type Scheme,
} from './scheme.js'

export type Preference = 'system' | 'light' | 'dark'

export type Appearance = {
  readonly mode: Preference
  /** La graine choisie sur cet appareil, ou rien : celle du site. */
  readonly seed?: string | undefined
}

export const STORAGE_KEY = 'basalte-panel-appearance'

export const DEFAULT_APPEARANCE: Appearance = { mode: 'system' }

const SEED = /^#[0-9a-f]{6}$/i

/** Les graines proposées dans « Compte », à côté de celle du site. */
export const PRESETS: readonly {
  readonly seed: string
  readonly label: string
}[] = [
  { seed: NEUTRAL_SEED, label: 'Neutre' },
  { seed: '#2f5bea', label: 'Bleu' },
  { seed: '#0f766e', label: 'Sarcelle' },
  { seed: '#3f8f3a', label: 'Vert' },
  { seed: '#b45309', label: 'Ambre' },
  { seed: '#c2410c', label: 'Terre cuite' },
  { seed: '#b3261e', label: 'Rouge' },
  { seed: '#7c3aed', label: 'Violet' },
  { seed: '#db2777', label: 'Rose' },
]

export const PREFERENCES: readonly {
  readonly value: Preference
  readonly label: string
}[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

type Storage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function isPreference(value: unknown): value is Preference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** Rien de choisi : le panel fait ce que le site et le système disent. */
function isDefaultAppearance(appearance: Appearance): boolean {
  return appearance.mode === 'system' && appearance.seed === undefined
}

/** Le nom de la variable que la feuille donne à un rôle. */
export function variable(role: string): string {
  return `--panel-color-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}

/** Un schéma sous la forme que `<html>` reçoit : une variable par rôle. */
export function declarations(
  colours: Scheme,
): Readonly<Record<string, string>> {
  const found: Record<string, string> = {}

  for (const role of ROLES) found[variable(role)] = colours[role]

  return found
}

/** Le mode qui s’applique, une fois le système consulté. */
export function resolveMode(preference: Preference, systemDark: boolean): Mode {
  if (preference === 'system') return systemDark ? 'dark' : 'light'

  return preference
}

/** La graine qui s’applique : celle de l’appareil, sinon celle du site. */
export function seedOf(
  appearance: Appearance,
  siteSeed: string | undefined,
): string {
  return appearance.seed ?? siteSeed ?? NEUTRAL_SEED
}

/**
 * Ce que le navigateur a retenu. Une valeur absente ou abîmée vaut le
 * défaut : rien ici ne doit empêcher le panel de s’ouvrir.
 */
export function readAppearance(storage: Storage): Appearance {
  try {
    const raw = storage.getItem(STORAGE_KEY)

    if (raw === null) return DEFAULT_APPEARANCE

    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_APPEARANCE
    }

    const record = parsed as Record<string, unknown>
    const mode = isPreference(record['mode']) ? record['mode'] : 'system'
    const seed =
      typeof record['seed'] === 'string' && SEED.test(record['seed'])
        ? record['seed'].toLowerCase()
        : undefined

    return seed === undefined ? { mode } : { mode, seed }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

/**
 * Ce que le navigateur retient : la préférence, et les deux schémas qu’elle
 * donne, calculés ici pour que l’amorçage n’ait rien à calculer. Le défaut
 * n’est pas rangé — il s’efface, et le panel repart du site et du système.
 */
export function writeAppearance(
  storage: Storage,
  appearance: Appearance,
  siteSeed: string | undefined,
): void {
  if (isDefaultAppearance(appearance)) {
    storage.removeItem(STORAGE_KEY)

    return
  }

  const seed = seedOf(appearance, siteSeed)

  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      mode: appearance.mode,
      ...(appearance.seed === undefined ? {} : { seed: appearance.seed }),
      light: declarations(scheme(seed, 'light')),
      dark: declarations(scheme(seed, 'dark')),
    }),
  )
}

type Root = {
  readonly style: {
    setProperty(name: string, value: string): void
    removeProperty(name: string): string
    colorScheme: string
  }
}

/**
 * Pose l’apparence sur `<html>`, en variables inline — elles gagnent sur
 * toute feuille, y compris celle de la graine du site. Le défaut retire tout
 * ce que ce module a pu poser : la feuille reprend la main.
 */
export function applyAppearance(
  appearance: Appearance,
  siteSeed: string | undefined,
  root: Root,
  systemDark: boolean,
): void {
  const style = root.style

  if (isDefaultAppearance(appearance)) {
    for (const role of ROLES) style.removeProperty(variable(role))

    style.colorScheme = ''

    return
  }

  const mode = resolveMode(appearance.mode, systemDark)
  const colours = declarations(scheme(seedOf(appearance, siteSeed), mode))

  for (const [name, value] of Object.entries(colours)) {
    style.setProperty(name, value)
  }

  style.colorScheme = mode
}

/**
 * Le script d’amorçage, inline dans `<head>` avant toute feuille : il lit ce
 * que `writeAppearance` a rangé, choisit le mode, et pose les variables. Il
 * se tait sur tout ce qui manque — un navigateur sans stockage, une valeur
 * d’une autre version — parce qu’une erreur ici est une page blanche.
 */
export const BOOT = [
  '(function(){try{',
  `var a=JSON.parse(localStorage.getItem('${STORAGE_KEY}'));`,
  'if(!a)return;',
  "var m=a.mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):a.mode;",
  'var c=a[m];if(!c)return;',
  'var s=document.documentElement.style;s.colorScheme=m;',
  'for(var k in c)s.setProperty(k,c[k])',
  '}catch(e){}})()',
].join('')
