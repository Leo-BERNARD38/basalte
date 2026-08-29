import { describe, expect, it } from 'vitest'

import { COMMANDS } from './commands.js'
import { run } from './run.js'

describe('run', () => {
  it('affiche toutes les commandes sans argument', async () => {
    const result = await run([], '0.1.0')

    expect(result.code).toBe(0)
    for (const command of COMMANDS) {
      expect(result.stdout).toContain(command.usage)
      expect(result.stdout).toContain(command.summary)
    }
  })

  it('affiche la version qu’on lui donne', async () => {
    expect(await run(['--version'], '1.2.3')).toEqual({
      code: 0,
      stdout: '1.2.3\n',
      stderr: '',
    })
  })

  it('refuse une commande inconnue en la nommant', async () => {
    const result = await run(['bidule'], '0.1.0')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('bidule')
  })

  it('annonce une commande connue mais non implémentée', async () => {
    const result = await run(['deploy'], '0.1.0')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('deploy')
    expect(result.stderr).toContain('pas encore')
  })

  it('rend le message d’une commande qui échoue, sans trace', async () => {
    const result = await run(['check'], '0.1.0', 'un-dossier-qui-n-existe-pas')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('site.config.ts')
    expect(result.stderr).not.toContain('    at ')
  })
})
