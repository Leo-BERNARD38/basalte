import { describe, expect, it, vi } from 'vitest'

import { defineSite } from '../site/define.js'
import { VARIABLES } from './email/provider.js'
import { authProvider } from './open.js'

const site = defineSite({
  name: 'Atelier Démonstration',
  domain: 'exemple.fr',
  languages: { fr: { default: true } },
  email: { provider: 'brevo' },
})

const CONFIGURED = {
  [VARIABLES.key]: 'clé',
  [VARIABLES.from]: 'bonjour@exemple.fr',
}

describe('authProvider', () => {
  it('choisit le fournisseur nommé dans site.config.ts', () => {
    expect(authProvider(site, CONFIGURED).name).toBe('brevo')
  })

  it('bascule sur la console et dit ce qui manque', () => {
    const written: string[] = []
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((line) => {
      written.push(String(line))

      return true
    })

    expect(authProvider(site, {}).name).toBe('console')

    spy.mockRestore()

    expect(written.join('')).toContain(VARIABLES.key)
    expect(written.join('')).toContain('terminal')
  })

  it('préfère la clé du canal d’authentification', () => {
    expect(
      authProvider(site, {
        ...CONFIGURED,
        [VARIABLES.authKey]: 'clé de connexion',
        [VARIABLES.authFrom]: 'connexion@exemple.fr',
      }).name,
    ).toBe('brevo')
  })

  it('refuse un fournisseur inconnu plutôt que de l’ignorer', () => {
    const other = defineSite({
      name: 'Atelier',
      domain: 'exemple.fr',
      languages: { fr: { default: true } },
      email: { provider: 'postmark' },
    })

    expect(() => authProvider(other, CONFIGURED)).toThrow('postmark')
  })
})
