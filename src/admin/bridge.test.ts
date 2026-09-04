import { describe, expect, it } from 'vitest'

import { BRIDGE, CHANNEL, fromPreview, toPreview } from './bridge.js'

describe('fromPreview', () => {
  it('lit les trois messages de l’aperçu', () => {
    expect(fromPreview({ channel: CHANNEL, kind: 'ready' })).toEqual({
      kind: 'ready',
    })
    expect(
      fromPreview({ channel: CHANNEL, kind: 'picked', id: 'hero' }),
    ).toEqual({ kind: 'picked', id: 'hero' })
    expect(fromPreview({ channel: CHANNEL, kind: 'insert', at: 2 })).toEqual({
      kind: 'insert',
      at: 2,
    })
  })

  it('refuse ce qui ne vient pas de l’aperçu', () => {
    // Une fenêtre reçoit le trafic de n’importe qui : une extension de
    // navigateur en poste plus que le cadre du panel.
    expect(fromPreview(undefined)).toBeUndefined()
    expect(fromPreview(null)).toBeUndefined()
    expect(fromPreview('picked')).toBeUndefined()
    expect(fromPreview({ kind: 'picked', id: 'hero' })).toBeUndefined()
    expect(
      fromPreview({ channel: 'autre', kind: 'picked', id: 'hero' }),
    ).toBeUndefined()
  })

  it('refuse un message de la bonne origine mais de mauvaise forme', () => {
    expect(fromPreview({ channel: CHANNEL, kind: 'parti' })).toBeUndefined()
    expect(fromPreview({ channel: CHANNEL, kind: 'picked' })).toBeUndefined()
    expect(
      fromPreview({ channel: CHANNEL, kind: 'picked', id: 12 }),
    ).toBeUndefined()
    expect(
      fromPreview({ channel: CHANNEL, kind: 'insert', at: '2' }),
    ).toBeUndefined()
    expect(
      fromPreview({ channel: CHANNEL, kind: 'insert', at: 1.5 }),
    ).toBeUndefined()
  })
})

describe('toPreview', () => {
  it('sépare désigner et amener en vue', () => {
    expect(toPreview('hero', true)).toEqual({
      channel: CHANNEL,
      kind: 'select',
      id: 'hero',
      reveal: true,
    })
    expect(toPreview('', false)['reveal']).toBe(false)
  })
})

describe('BRIDGE', () => {
  it('ne parle qu’à son parent, et sur la seule origine du panel', () => {
    expect(BRIDGE).toContain('window.parent')
    expect(BRIDGE).toContain('window.location.origin')
    expect(BRIDGE).toContain('event.origin !== origin')
    expect(BRIDGE).toContain(CHANNEL)
  })

  it('annonce qu’il est prêt, pour que le panel lui redise le choix', () => {
    // Le cadre est remonté à chaque enregistrement : sans cette annonce, la
    // marque de la section choisie serait perdue à chaque fois.
    expect(BRIDGE).toContain("tell({ kind: 'ready' })")
  })

  it('n’écrit ni n’évalue rien', () => {
    expect(BRIDGE).not.toContain('innerHTML')
    expect(BRIDGE).not.toContain('eval(')
    expect(BRIDGE.startsWith('(function () {')).toBe(true)
  })
})
