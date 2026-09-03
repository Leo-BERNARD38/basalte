// `basalte deploy` : du VPS nu au site en ligne, et la même commande pour le
// mettre à jour ensuite.
//
// Deux gestes restent manuels, parce qu’aucun outil ne peut les faire à la
// place du mainteneur : commander la machine, et faire pointer le domaine vers
// elle. Il n’y a pas de troisième geste, et pas de guide.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  addDeployKey,
  githubSlug,
  githubToken,
  remoteOf,
} from '../client/repository.js'
import {
  provision,
  type Deployment,
  type StepResult,
} from '../deploy/provision.js'
import { dryRunner, sshRunner } from '../deploy/runner.js'
import { contactAddress } from '../server/email/provider.js'
import { tryGit } from '../server/git.js'
import { loadEnvironment } from '../server/open.js'
import { loadSite } from '../site/load.js'
import { fails, hasFlag, heading, line, optionValue, succeeds } from './args.js'
import { doctor } from './doctor.js'
import { isSlug } from './init.js'
import type { Result } from './run.js'

const ENV_FILE = '.env'

export async function deploy(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const host = optionValue(argv, '--host')

  if (host === undefined) {
    return fails([
      'Il manque l’adresse de la machine : basalte deploy --host <ip>',
    ])
  }

  const site = await loadSite(cwd)
  const environment = await secrets(cwd)

  if (environment === undefined) {
    return fails([
      `« ${ENV_FILE} » est absent de ce dépôt.`,
      'Copie « .env.example », remplis-le, puis relance.',
    ])
  }

  const slug = path.basename(cwd)

  // Le nom du dossier devient celui du dépôt sur la machine : il traverse un
  // script shell, un chemin et un nom de conteneur, et seul un nom d’`init`
  // y passe entier.
  if (!isSlug(slug)) {
    return fails([
      `« ${slug} » ne peut pas nommer un site : lettres minuscules, chiffres et tirets seulement — renomme le dossier.`,
    ])
  }

  loadEnvironment(cwd)

  const recorded: string[] = []
  const dry = hasFlag(argv, '--dry-run')
  const origin = await remoteUrl(cwd)
  const account = optionValue(argv, '--user') ?? contactAddress(process.env)

  const target: Deployment = {
    slug,
    ...(origin === undefined ? {} : { remote: origin.ssh }),
    env: environment,
    ...(account === '' ? {} : { account }),
    run: dry ? dryRunner(recorded) : sshRunner(host),
    ...(dry || origin === undefined ? {} : registrar(origin.slug)),
  }

  const lines = [...heading('deploy', `${site.name} → ${host}`)]

  if (!dry) process.stdout.write(`${lines.join('\n')}\n\nEn cours…\n\n`)

  const steps = await provision(target)
  const broken = steps.some((step) => step.level === 'error')

  lines.push(...render(steps))

  if (dry) {
    lines.push('', 'Rien n’a été exécuté. La séquence :', '')
    lines.push(...recorded.flatMap((command) => [...indent(command), '']))

    return broken
      ? fails(lines, 'La séquence s’arrêterait là. Corrige, puis relance.')
      : succeeds(lines)
  }

  if (broken) {
    return fails(lines, 'La machine n’est pas prête. Corrige, puis relance.')
  }

  process.stdout.write(`${lines.join('\n')}\n\n`)

  return doctor([...argv], cwd)
}

/** Ce qui enregistre la clé de la machine sur le dépôt, quand un jeton existe. */
function registrar(slug: string): Pick<Deployment, 'registerKey'> {
  const token = githubToken(process.env)

  if (token === undefined) return {}

  return {
    registerKey: (publicKey) =>
      addDeployKey(slug, token, `basalte — ${slug}`, publicKey),
  }
}

async function secrets(cwd: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(cwd, ENV_FILE), 'utf8')
  } catch {
    return undefined
  }
}

/**
 * Le distant du dépôt, ramené à sa forme SSH : c’est par elle que la machine
 * clone, avec la clé de déploiement qui lui est propre.
 */
async function remoteUrl(
  cwd: string,
): Promise<{ readonly slug: string; readonly ssh: string } | undefined> {
  const found = await tryGit(cwd, ['remote', 'get-url', 'origin'])
  const slug = found.kind === 'done' ? githubSlug(found.stdout) : undefined

  return slug === undefined ? undefined : remoteOf(slug)
}

function render(steps: readonly StepResult[]): readonly string[] {
  return steps.flatMap((step) => [
    line(
      step.level,
      step.detail === undefined ? step.label : `${step.label} — ${step.detail}`,
    ),
    ...(step.output === undefined || step.output === ''
      ? []
      : indent(step.output)),
  ])
}

function indent(command: string): readonly string[] {
  return command.split('\n').map((entry) => `    ${entry}`)
}
