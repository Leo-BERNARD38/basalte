import { describe, expect, it } from 'vitest'

import { formatDate, isDate, today, yearOf } from './date.js'

describe('isDate', () => {
  it('accepte une date qui existe au calendrier', () => {
    expect(isDate('2026-08-31')).toBe(true)
    expect(isDate('2024-02-29')).toBe(true)
  })

  it('refuse une date que le motif seul laisserait passer', () => {
    expect(isDate('2026-02-31')).toBe(false)
    expect(isDate('2025-02-29')).toBe(false)
    expect(isDate('2026-13-01')).toBe(false)
  })

  it('refuse une autre écriture, et le vide', () => {
    expect(isDate('31/08/2026')).toBe(false)
    expect(isDate('2026-8-31')).toBe(false)
    expect(isDate('')).toBe(false)
  })
})

describe('today', () => {
  it('rend une date valide, lue dans le fuseau de la machine', () => {
    expect(isDate(today())).toBe(true)
    expect(today(new Date(2026, 7, 31, 23, 30))).toBe('2026-08-31')
  })
})

describe('formatDate', () => {
  it('suit la langue, et ne recule pas d’un jour', () => {
    expect(formatDate('2026-08-31', 'fr')).toBe('31 août 2026')
    expect(formatDate('2026-08-31', 'en')).toBe('August 31, 2026')
  })

  it('rend une valeur illisible telle quelle', () => {
    expect(formatDate('bientôt', 'fr')).toBe('bientôt')
  })
})

describe('yearOf', () => {
  it('donne l’année qui groupe les billets', () => {
    expect(yearOf('2026-08-31')).toBe('2026')
  })
})
