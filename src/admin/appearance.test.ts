import { describe, expect, it } from 'vitest'

import {
  applyAppearance,
  BOOT,
  DEFAULT_APPEARANCE,
  declarations,
  PRESETS,
  readAppearance,
  resolveMode,
  seedOf,
  STORAGE_KEY,
  writeAppearance,
} from './appearance.js'
import { NEUTRAL_SEED, ROLES, scheme } from './scheme.js'
import { tokens } from './tokens.js'

function memory(): Map<string, string> & {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
} {
  const map = new Map<string, string>()

  return Object.assign(map, {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  })
}

function root() {
  const set = new Map<string, string>()
  const style = {
    colorScheme: '',
    setProperty: (name: string, value: string) => void set.set(name, value),
    removeProperty: (name: string) => {
      const was = set.get(name) ?? ''

      set.delete(name)

      return was
    },
  }

  return { style, set }
}

describe('l’apparence choisie par appareil', () => {
  it('vaut le défaut quand rien n’est rangé, ou n’importe quoi', () => {
    const storage = memory()

    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE)

    storage.setItem(STORAGE_KEY, '{')
    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE)

    storage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'sepia', seed: 'red' }))
    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE)
  })

  it('se range avec ses deux schémas déjà calculés, et se relit', () => {
    const storage = memory()

    writeAppearance(storage, { mode: 'dark', seed: '#2F5BEA' }, undefined)

    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >

    expect(raw['mode']).toBe('dark')
    expect(raw['light']).toEqual(declarations(scheme('#2F5BEA', 'light')))
    expect(raw['dark']).toEqual(declarations(scheme('#2F5BEA', 'dark')))
    expect(readAppearance(storage)).toEqual({ mode: 'dark', seed: '#2f5bea' })
  })

  it('calcule les schémas sur la graine du site quand seul le mode est forcé', () => {
    const storage = memory()

    writeAppearance(storage, { mode: 'light' }, '#0f766e')

    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >

    expect(raw['light']).toEqual(declarations(scheme('#0f766e', 'light')))
    expect(readAppearance(storage)).toEqual({ mode: 'light' })
  })

  it('efface ce qu’il avait rangé quand on revient au défaut', () => {
    const storage = memory()

    writeAppearance(storage, { mode: 'dark' }, undefined)
    writeAppearance(storage, DEFAULT_APPEARANCE, undefined)

    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('nomme chaque rôle comme la feuille le nomme', () => {
    const light = declarations(tokens.color.light)

    expect(Object.keys(light)).toHaveLength(ROLES.length)
    expect(light['--panel-color-on-surface-variant']).toBe(
      tokens.color.light.onSurfaceVariant,
    )
    expect(light['--panel-color-surface-container-lowest']).toBe(
      tokens.color.light.surfaceContainerLowest,
    )
  })

  it('suit le système, sauf quand un mode est forcé', () => {
    expect(resolveMode('system', true)).toBe('dark')
    expect(resolveMode('system', false)).toBe('light')
    expect(resolveMode('light', true)).toBe('light')
    expect(resolveMode('dark', false)).toBe('dark')
  })

  it('prend la graine de l’appareil, sinon celle du site, sinon le neutre', () => {
    expect(seedOf({ mode: 'system', seed: '#b3261e' }, '#2f5bea')).toBe(
      '#b3261e',
    )
    expect(seedOf({ mode: 'system' }, '#2f5bea')).toBe('#2f5bea')
    expect(seedOf({ mode: 'system' }, undefined)).toBe(NEUTRAL_SEED)
  })

  it('pose les variables du mode résolu sur la racine, et les retire au défaut', () => {
    const page = root()

    applyAppearance({ mode: 'system', seed: '#7c3aed' }, undefined, page, true)

    expect(page.style.colorScheme).toBe('dark')
    expect(page.set.get('--panel-color-primary')).toBe(
      scheme('#7c3aed', 'dark').primary,
    )
    expect(page.set.size).toBe(ROLES.length)

    applyAppearance(DEFAULT_APPEARANCE, undefined, page, true)

    expect(page.style.colorScheme).toBe('')
    expect(page.set.size).toBe(0)
  })

  it('propose des graines qui tiennent toutes le plancher', () => {
    expect(PRESETS.map((preset) => preset.seed)).toContain(NEUTRAL_SEED)
    expect(new Set(PRESETS.map((preset) => preset.seed)).size).toBe(
      PRESETS.length,
    )
  })

  it('amorce depuis la clé rangée, sans rien recalculer', () => {
    expect(BOOT).toContain(STORAGE_KEY)
    expect(BOOT).toContain('prefers-color-scheme: dark')
    expect(BOOT).not.toContain('scheme(')
    expect(BOOT.startsWith('(function(){try{')).toBe(true)
  })
})
