// La mise en production, telle qu’elle se déroule sur la machine.
//
// Chaque étape est idempotente : la commande relancée met la machine à jour au
// lieu de la refaire, et elle ne touche jamais au contenu — celui-ci appartient
// au panel. Il n’y a donc qu’une commande à retenir, pour le premier jour comme
// pour les suivants (D29).
//
// Le premier build n’est pas déclenché ici : l’application publie d’elle-même
// au démarrage quand la version en ligne ne correspond plus au dépôt. Cette
// séquence la réveille, puis attend que le lien `current` existe.

import type { Level } from '../cli/args.js'
import { APP_PORT, SERVED_ROOT } from '../client/docker.js'
import type { Runner } from './runner.js'

export const SITE_PARENT = '/srv'
export const KEY_FILE = '/root/.ssh/basalte_deploy'
export const READY_TRIES = 120

export type Deployment = {
  readonly slug: string
  /** L’adresse SSH du dépôt du site, absente quand il n’en a pas encore. */
  readonly remote?: string
  /** Le `.env` lu sur la machine du mainteneur, jamais versionné. */
  readonly env: string
  /** L’adresse du compte du client, quand elle est connue. */
  readonly account?: string
  readonly run: Runner
  /** Enregistre la clé publique sur le dépôt ; absente sans jeton GitHub. */
  readonly registerKey?: (publicKey: string) => Promise<boolean>
}

export type StepResult = {
  readonly label: string
  readonly level: Level
  readonly detail?: string
  /** Ce que la machine a répondu, à recopier tel quel sous la ligne. */
  readonly output?: string
}

type Step = (target: Deployment) => Promise<StepResult>

export function siteDirectory(slug: string): string {
  return `${SITE_PARENT}/${slug}`
}

/** Déroule la séquence, et s’arrête à la première étape en échec. */
export async function provision(
  target: Deployment,
): Promise<readonly StepResult[]> {
  const done: StepResult[] = []

  for (const step of steps()) {
    const result = await step(target)

    done.push(result)

    if (result.level === 'error') break
  }

  return done
}

function steps(): readonly Step[] {
  return [tooling, deployKey, repository, secrets, containers, online, account]
}

async function tooling(target: Deployment): Promise<StepResult> {
  return report(
    'outils de base',
    await target.run(
      [
        'command -v curl >/dev/null 2>&1 || {',
        '  apt-get update -qq',
        '  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates',
        '}',
        'command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh',
        'docker --version',
      ].join('\n'),
    ),
  )
}

// La clé naît sur la machine : sa moitié privée n’en sort jamais, et le jeton
// du mainteneur ne s’en approche pas.
async function deployKey(target: Deployment): Promise<StepResult> {
  const created = await target.run(
    [
      'mkdir -p /root/.ssh && chmod 700 /root/.ssh',
      `test -f ${KEY_FILE} || ssh-keygen -q -t ed25519 -N '' -C 'basalte ${target.slug}' -f ${KEY_FILE}`,
      "grep -q 'IdentityFile " +
        KEY_FILE +
        "' /root/.ssh/config 2>/dev/null || printf 'Host github.com\\n  IdentityFile " +
        KEY_FILE +
        "\\n  IdentitiesOnly yes\\n  StrictHostKeyChecking accept-new\\n' >> /root/.ssh/config",
      `cat ${KEY_FILE}.pub`,
    ].join('\n'),
  )

  if (created.code !== 0) return failed('clé de déploiement', created.stderr)

  if (target.registerKey === undefined) {
    return {
      label: 'clé de déploiement',
      level: 'warning',
      detail: 'sans GITHUB_TOKEN — ajoute cette clé au dépôt, en écriture',
      output: created.stdout.trim(),
    }
  }

  const added = await target.registerKey(created.stdout.trim())

  return {
    label: 'clé de déploiement',
    level: 'ok',
    detail: added ? 'créée et enregistrée sur le dépôt' : 'déjà enregistrée',
  }
}

async function repository(target: Deployment): Promise<StepResult> {
  if (target.remote === undefined) {
    return failed(
      'dépôt du site',
      'ce dépôt n’a pas de distant : crée-le, pousse la branche « main », puis relance.',
    )
  }

  const directory = siteDirectory(target.slug)

  return report(
    'dépôt du site',
    await target.run(
      [
        `mkdir -p ${SITE_PARENT}`,
        `if [ -d ${directory}/.git ]; then`,
        `  git -C ${directory} pull --ff-only`,
        'else',
        `  git clone ${target.remote} ${directory}`,
        'fi',
      ].join('\n'),
    ),
  )
}

async function secrets(target: Deployment): Promise<StepResult> {
  const directory = siteDirectory(target.slug)

  // Le masque précède l’écriture : `chmod` seul laisserait le fichier lisible
  // de tous entre sa création et lui.
  return report(
    'secrets',
    await target.run(
      [
        'umask 077',
        `cat > ${directory}/.env`,
        `chmod 600 ${directory}/.env`,
      ].join('\n'),
      target.env,
    ),
  )
}

async function containers(target: Deployment): Promise<StepResult> {
  return report(
    'conteneurs',
    await target.run(
      `cd ${siteDirectory(target.slug)} && docker compose up -d --build`,
    ),
  )
}

// La première requête ouvre le panel, qui publie alors le site. Elle est
// frappée sur le réseau interne des conteneurs, jamais par le domaine : le
// certificat n’est pas encore obtenu et l’enregistrement DNS peut ne pas être
// propagé, alors que le premier build, lui, n’attend ni l’un ni l’autre.
//
// Le réveil est répété tant que le lien n’existe pas, parce que les conteneurs
// mettent un temps variable à répondre. Frapper deux fois ne construit pas
// deux fois : la mise en ligne n’a qu’une place (D71).
async function online(target: Deployment): Promise<StepResult> {
  const directory = siteDirectory(target.slug)

  const ready = await target.run(
    [
      `cd ${directory}`,
      `i=0`,
      `while [ $i -lt ${READY_TRIES} ]; do`,
      `  docker compose exec -T app sh -c 'test -e ${SERVED_ROOT}/current' && exit 0`,
      `  docker compose exec -T caddy wget -q -T 10 -O /dev/null http://app:${APP_PORT}/admin >/dev/null 2>&1 || true`,
      '  i=$((i + 1))',
      '  sleep 5',
      'done',
      'exit 1',
    ].join('\n'),
  )

  return ready.code === 0
    ? {
        label: 'site en ligne',
        level: 'ok',
        detail: 'première version publiée',
      }
    : failed(
        'site en ligne',
        `aucune version après ${(READY_TRIES * 5) / 60} minutes — « docker compose logs app » sur la machine`,
      )
}

async function account(target: Deployment): Promise<StepResult> {
  if (target.account === undefined) {
    return {
      label: 'compte du client',
      level: 'warning',
      detail:
        'aucune adresse connue — renseigne CONTACT_EMAIL, ou passe « --user ».',
    }
  }

  const created = await target.run(
    `cd ${siteDirectory(target.slug)} && docker compose exec -T app npx basalte admin:login --user ${target.account} --create`,
  )

  if (created.code === 0) {
    return {
      label: 'compte du client',
      level: 'ok',
      detail: `créé pour ${target.account}`,
      output: created.stdout.trim(),
    }
  }

  return created.stderr.includes('existe déjà')
    ? { label: 'compte du client', level: 'ok', detail: 'déjà créé' }
    : failed('compte du client', created.stderr)
}

function report(
  label: string,
  run: { code: number; stderr: string },
): StepResult {
  return run.code === 0 ? { label, level: 'ok' } : failed(label, run.stderr)
}

function failed(label: string, detail: string): StepResult {
  return { label, level: 'error', detail: detail.trim() }
}
