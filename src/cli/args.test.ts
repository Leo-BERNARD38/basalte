import { describe, expect, it } from 'vitest'

import {
  fails,
  hasFlag,
  line,
  optionValue,
  positionals,
  succeeds,
} from './args.js'

describe('lecture des arguments', () => {
  it('reconnaît un drapeau, avec ou sans valeur attachée', () => {
    expect(hasFlag(['--build'], '--build')).toBe(true)
    expect(hasFlag(['--json=1'], '--json')).toBe(true)
    expect(hasFlag(['--builder'], '--build')).toBe(false)
    expect(hasFlag([], '--build')).toBe(false)
  })

  it('lit une option écrite dans les deux formes', () => {
    expect(optionValue(['--user', 'a@b.fr'], '--user')).toBe('a@b.fr')
    expect(optionValue(['--user=a@b.fr'], '--user')).toBe('a@b.fr')
    expect(optionValue(['--user'], '--user')).toBeUndefined()
    expect(optionValue([], '--user')).toBeUndefined()
  })

  it('ne prend pour positionnel ni un drapeau ni la valeur qu’il consomme', () => {
    const argv = ['mon-client', '--host', '1.2.3.4', '--dry-run', 'liste.txt']

    expect(positionals(argv, ['--host'])).toEqual(['mon-client', 'liste.txt'])
  })

  it('laisse passer un positionnel qui suit un drapeau sans valeur', () => {
    expect(positionals(['--dry-run', 'sites.txt'], ['--host'])).toEqual([
      'sites.txt',
    ])
  })
})

describe('lignes rendues', () => {
  it('marque chaque niveau à la même indentation', () => {
    expect(line('ok', 'fait')).toBe('  ✓ fait')
    expect(line('error', 'cassé')).toBe('  ✗ cassé')
    expect(line('warning', 'tiède')).toBe('  ⚠ tiède')
  })

  it('met tout sur la sortie d’erreur quand ça échoue', () => {
    const result = fails([line('error', 'cassé')], 'Rien n’a été construit.')

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('cassé')
    expect(result.stderr).toContain('Rien n’a été construit.')
  })

  it('met tout sur la sortie standard quand ça réussit', () => {
    expect(succeeds(['a', 'b'])).toEqual({
      code: 0,
      stdout: 'a\nb\n',
      stderr: '',
    })
  })
})
