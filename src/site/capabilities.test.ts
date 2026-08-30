import { describe, expect, it } from 'vitest'

import { CAPABILITY_LABELS, resolveCapabilities } from './capabilities.js'

describe('resolveCapabilities', () => {
  it('notifie les leads et mesure l’audience, et refuse les documents', () => {
    expect(resolveCapabilities()).toEqual({
      notifyLeads: true,
      analytics: true,
      documents: false,
    })
  })

  it('ne change que ce qui est déclaré', () => {
    expect(resolveCapabilities({ documents: true })).toEqual({
      notifyLeads: true,
      analytics: true,
      documents: true,
    })
  })

  it('refuse une capacité que le socle ne porte pas', () => {
    expect(() => resolveCapabilities({ blog: true } as never)).toThrow(/blog/)
  })

  it('nomme chaque capacité en français, et rien de plus', () => {
    expect(Object.keys(CAPABILITY_LABELS)).toEqual(
      Object.keys(resolveCapabilities()),
    )
  })
})
