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
    expect(
      fromPreview({ channel: CHANNEL, kind: 'insert', before: 'tarifs' }),
    ).toEqual({ kind: 'insert', before: 'tarifs' })
    // Vide : à la fin de la page.
    expect(
      fromPreview({ channel: CHANNEL, kind: 'insert', before: '' }),
    ).toEqual({ kind: 'insert', before: '' })
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
    expect(fromPreview({ channel: CHANNEL, kind: 'insert' })).toBeUndefined()
    expect(
      fromPreview({ channel: CHANNEL, kind: 'insert', before: 2 }),
    ).toBeUndefined()
  })
})

describe('toPreview', () => {
  it('sépare désigner et amener en vue', () => {
    expect(toPreview('hero', true, true)).toEqual({
      channel: CHANNEL,
      kind: 'select',
      id: 'hero',
      reveal: true,
      live: true,
    })
    expect(toPreview('', false, true)['reveal']).toBe(false)
  })

  it('dit quand le cadre n’est pas une surface d’édition', () => {
    expect(toPreview('', false, false)['live']).toBe(false)
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

  it('ne répond au clic que si le panel l’a dit', () => {
    // Sous l’entrée de l’en-tête et du pied, le cadre montre l’accueil : ses
    // sections appartiennent à une autre entrée, et rien ne doit y répondre.
    expect(BRIDGE).toContain("hasAttribute('data-canvas')")
    expect(BRIDGE).toContain("toggleAttribute('data-canvas'")
  })

  it('n’écrit ni n’évalue rien', () => {
    expect(BRIDGE).not.toContain('innerHTML')
    expect(BRIDGE).not.toContain('eval(')
    expect(BRIDGE.startsWith('(function () {')).toBe(true)
  })
})
