import { describe, expect, it } from 'vitest'

import { provision, siteDirectory, type Deployment } from './provision.js'
import type { Run, Runner } from './runner.js'
import { quote } from './runner.js'

const KEY = 'ssh-ed25519 AAAAC3Nza basalte atelier'

type Reply = (command: string) => Run | undefined

function machine(reply: Reply = () => undefined) {
  const seen: string[] = []

  const run: Runner = (command, stdin) => {
    seen.push(stdin === undefined ? command : `${command}\n<<${stdin}`)

    return Promise.resolve(
      reply(command) ?? { code: 0, stdout: '', stderr: '' },
    )
  }

  return { run, seen }
}

function target(parts: Partial<Deployment> = {}): Deployment {
  const { run } = machine()

  return {
    slug: 'atelier',
    remote: 'git@github.com:moi/atelier.git',
    env: 'EMAIL_API_KEY=secret\n',
    account: 'client@atelier.fr',
    run,
    ...parts,
  }
}

describe('séquence de mise en production', () => {
  it('va jusqu’au compte quand tout répond', async () => {
    const { run, seen } = machine((command) =>
      command.includes('ssh-keygen')
        ? { code: 0, stdout: KEY, stderr: '' }
        : undefined,
    )

    const steps = await provision(target({ run }))

    expect(steps.map((step) => step.label)).toEqual([
      'outils de base',
      'clé de déploiement',
      'dépôt du site',
      'secrets',
      'conteneurs',
      'site en ligne',
      'compte du client',
    ])
    expect(steps.every((step) => step.level !== 'error')).toBe(true)
    expect(seen.join('\n')).toContain('get.docker.com')
    expect(seen.join('\n')).toContain(
      `git clone git@github.com:moi/atelier.git`,
    )
  })

  it('n’installe Docker que s’il manque', async () => {
    const { run, seen } = machine()

    await provision(target({ run }))

    expect(seen[0]).toContain('command -v docker >/dev/null 2>&1 ||')
  })

  it('met à jour un dépôt déjà cloné plutôt que de le recloner', async () => {
    const { run, seen } = machine()

    await provision(target({ run }))

    const clone = seen.find((command) => command.includes('git clone'))

    expect(clone).toContain(`test -d ${siteDirectory('atelier')}/.git`.slice(5))
    expect(clone).toContain('git -C /srv/atelier pull --ff-only')
  })

  it('fait passer le .env par l’entrée standard, jamais par un fichier', async () => {
    const { run, seen } = machine()

    await provision(target({ run }))

    const secrets = seen.find((command) => command.includes('.env'))

    expect(secrets).toContain('<<EMAIL_API_KEY=secret')
    expect(secrets).toContain('chmod 600')
    expect(seen.join('\n')).not.toContain('EMAIL_API_KEY=secret\ncat')
  })

  it('s’arrête à la première étape en échec', async () => {
    const { run } = machine((command) =>
      command.includes('git clone')
        ? { code: 1, stdout: '', stderr: 'Permission denied (publickey).' }
        : undefined,
    )

    const steps = await provision(target({ run }))

    expect(steps.map((step) => step.label)).toEqual([
      'outils de base',
      'clé de déploiement',
      'dépôt du site',
    ])
    expect(steps.at(-1)).toMatchObject({
      level: 'error',
      detail: 'Permission denied (publickey).',
    })
  })

  it('affiche la clé publique quand aucun jeton ne peut l’enregistrer', async () => {
    const { run } = machine((command) =>
      command.includes('ssh-keygen')
        ? { code: 0, stdout: `${KEY}\n`, stderr: '' }
        : undefined,
    )

    const steps = await provision(target({ run }))

    expect(steps[1]).toMatchObject({ level: 'warning', output: KEY })
  })

  it('enregistre la clé sur le dépôt quand un jeton est là', async () => {
    const { run } = machine((command) =>
      command.includes('ssh-keygen')
        ? { code: 0, stdout: KEY, stderr: '' }
        : undefined,
    )

    const offered: string[] = []

    const steps = await provision(
      target({
        run,
        registerKey: async (publicKey) => {
          offered.push(publicKey)

          return true
        },
      }),
    )

    expect(offered).toEqual([KEY])
    expect(steps[1]).toMatchObject({ level: 'ok' })
  })

  it('réveille l’application sur le réseau des conteneurs, pas par le domaine', async () => {
    const { run, seen } = machine()

    await provision(target({ run }))

    const wake = seen.find((command) => command.includes('while'))

    expect(wake).toContain('http://app:3000/admin')
    expect(wake).not.toContain('https://')
  })

  it('écrit le .env sous un masque, pas seulement un chmod après coup', async () => {
    const { run, seen } = machine()

    await provision(target({ run }))

    const written = seen.find((command) => command.includes('.env'))

    expect(written).toContain('EMAIL_API_KEY=secret')
    expect(written?.indexOf('umask 077')).toBe(0)
  })

  it('refuse de déployer un dépôt sans distant', async () => {
    const { slug, env, run } = target()

    const steps = await provision({
      slug,
      env,
      account: 'client@atelier.fr',
      run,
    })

    expect(steps.at(-1)).toMatchObject({
      label: 'dépôt du site',
      level: 'error',
    })
  })

  it('tient un compte déjà créé pour un succès', async () => {
    const { run } = machine((command) =>
      command.includes('admin:login')
        ? {
            code: 1,
            stdout: '',
            stderr: 'Un compte existe déjà pour « client@atelier.fr ».',
          }
        : undefined,
    )

    const steps = await provision(target({ run }))

    expect(steps.at(-1)).toMatchObject({ level: 'ok', detail: 'déjà créé' })
  })

  it('dit ce qui manque quand aucune adresse de client n’est connue', async () => {
    const { slug, env, run } = target()

    const steps = await provision({
      slug,
      remote: 'git@github.com:moi/atelier.git',
      env,
      run,
    })

    expect(steps.at(-1)).toMatchObject({
      label: 'compte du client',
      level: 'warning',
    })
  })
})

describe('script distant', () => {
  it('réduit un script entier à un seul mot pour le shell', () => {
    expect(quote("echo 'salut'")).toBe(`'echo '\\''salut'\\'''`)
  })
})
