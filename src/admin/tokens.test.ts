// Les valeurs vivent dans `tokens.ts`, et `panel.css` les pose en variables.
// Écrites deux fois, elles divergeraient : ce test les compare, si bien que la
// feuille n’a pas à être générée pour rester juste.
//
// La feuille pose deux blocs : `:root`, qui porte tout et les couleurs du
// clair, et le `:root` sous `prefers-color-scheme: dark`, qui ne porte que
// les couleurs du sombre. Le test lit les deux, et chacun doit dire
// exactement ce que le module dit.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { tokens } from './tokens.js'

const PREFIX = '--panel-'

const sheet = readFileSync(new URL('./panel.css', import.meta.url), 'utf8')

/** Le premier `:root`, fermé par une accolade en début de ligne. */
function lightBlock(): string {
  const opened = sheet.indexOf(':root {')
  const closed = sheet.indexOf('\n}', opened)

  return sheet.slice(opened, closed)
}

/** Le `:root` du mode sombre, fermé par une accolade indentée d’un cran. */
function darkBlock(): string {
  const media = sheet.indexOf('@media (prefers-color-scheme: dark)')
  const opened = sheet.indexOf(':root {', media)
  const closed = sheet.indexOf('\n  }', opened)

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

function declared(block: string): Map<string, string> {
  const found = new Map<string, string>()

  for (const [, name, value] of block.matchAll(
    /(--panel-[a-z0-9-]+)\s*:\s*([^;]+);/g,
  )) {
    if (name !== undefined && value !== undefined) found.set(name, plain(value))
  }

  return found
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/** Les rôles de couleur d’un mode, sous le nom que la feuille leur donne. */
function colours(mode: 'light' | 'dark'): Map<string, string> {
  const flat = new Map<string, string>()

  for (const [role, value] of Object.entries(tokens.color[mode])) {
    flat.set(`${PREFIX}color-${kebab(role)}`, value)
  }

  return flat
}

/** Tout ce que le premier bloc doit poser : les tokens, et le clair. */
function expected(): Map<string, string> {
  const flat = colours('light')

  for (const [family, value] of Object.entries(tokens)) {
    if (family === 'color') continue

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
    const posed = declared(lightBlock())

    for (const [name, value] of expected()) {
      expect(posed.get(name), `« ${name} » manque à panel.css`).toBe(value)
    }
  })

  it('n’en laissent aucun orphelin dans la feuille', () => {
    const known = expected()
    const orphans = [...declared(lightBlock()).keys()].filter(
      (name) => !known.has(name),
    )

    expect(orphans).toEqual([])
  })

  it('posent le sombre sous la media query, et rien que ses couleurs', () => {
    const posed = declared(darkBlock())
    const dark = colours('dark')

    expect(new Map([...posed].sort())).toEqual(new Map([...dark].sort()))
  })

  it('portent une police, une largeur et les hachures', () => {
    const posed = declared(lightBlock())

    expect(posed.get('--panel-font-sans')).toContain('Roboto Flex')
    expect(posed.get('--panel-width-phone')).toBe('414px')
    expect(posed.get('--panel-hatch')).toContain('repeating-linear-gradient')
  })
})
