// Les valeurs vivent dans `tokens.ts`, et `panel.css` les pose en variables.
// Écrites deux fois, elles divergeraient : ce test les compare, si bien que la
// feuille n’a pas à être générée pour rester juste.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { tokens } from './tokens.js'

const PREFIX = '--panel-'

const sheet = readFileSync(new URL('./panel.css', import.meta.url), 'utf8')

/** Le bloc `:root`, seul endroit où une variable du panel se définit. */
function root(): string {
  const opened = sheet.indexOf(':root {')
  const closed = sheet.indexOf('\n}', opened)

  return sheet.slice(opened, closed)
}

/**
 * Une valeur CSS réduite à ce qu’elle dit. Prettier replie les longues sur
 * plusieurs lignes et aligne leurs parenthèses : sans cette mise à plat, une
 * dégradé identique se lirait comme deux valeurs différentes.
 */
function plain(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*,\s*/g, ',')
    .trim()
}

function declared(): Map<string, string> {
  const found = new Map<string, string>()

  for (const [, name, value] of root().matchAll(
    /(--panel-[a-z0-9-]+)\s*:\s*([^;]+);/g,
  )) {
    if (name !== undefined && value !== undefined) found.set(name, plain(value))
  }

  return found
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/** Les tokens à plat, sous le nom que la feuille leur donne. */
function expected(): Map<string, string> {
  const flat = new Map<string, string>()

  for (const [family, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      flat.set(`${PREFIX}${kebab(family)}`, plain(value))
      continue
    }

    for (const [name, nested] of Object.entries(value)) {
      flat.set(`${PREFIX}${kebab(family)}-${kebab(name)}`, plain(nested))
    }
  }

  return flat
}

describe('les tokens du panel', () => {
  it('sont tous posés par la feuille, à la même valeur', () => {
    const posed = declared()

    for (const [name, value] of expected()) {
      expect(posed.get(name), `« ${name} » manque à panel.css`).toBe(value)
    }
  })

  it('n’en laissent aucun orphelin dans la feuille', () => {
    const known = expected()
    const orphans = [...declared().keys()].filter((name) => !known.has(name))

    expect(orphans).toEqual([])
  })

  it('portent une police, une largeur et les hachures', () => {
    const posed = declared()

    expect(posed.get('--panel-font-sans')).toContain('Geist')
    expect(posed.get('--panel-width-phone')).toBe('414px')
    expect(posed.get('--panel-hatch')).toContain('repeating-linear-gradient')
  })
})
