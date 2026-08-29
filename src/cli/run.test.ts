import { describe, expect, it } from 'vitest'

import { COMMANDS } from './commands.js'
import { run } from './run.js'

describe('run', () => {
  it('affiche toutes les commandes sans argument', () => {
    const result = run([], '0.1.0')

    expect(result.code).toBe(0)
    for (const command of COMMANDS) {
      expect(result.stdout).toContain(command.usage)
      expect(result.stdout).toContain(command.summary)
    }
  })

  it("affiche la version qu'on lui donne", () => {
    expect(run(['--version'], '1.2.3')).toEqual({
      code: 0,
      stdout: '1.2.3\n',
      stderr: '',
    })
  })

  it('refuse une commande inconnue en la nommant', () => {
    const result = run(['bidule'], '0.1.0')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('bidule')
  })

  it('annonce une commande connue mais non implémentée', () => {
    const result = run(['check'], '0.1.0')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('check')
    expect(result.stderr).toContain('pas encore')
  })
})
