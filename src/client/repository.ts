// Le dépôt git d’un site : sa création locale, et son jumeau sur GitHub.
//
// Le jeton reste sur la machine du mainteneur et ne part jamais sur un VPS.
// Ce que la machine reçoit est une clé de déploiement propre à ce dépôt : un
// VPS compromis n’ouvre alors que le site qu’il sert, et jamais les autres.

import { isRepositoryRoot, tryGit } from '../server/git.js'
import type { Environment } from '../server/email/provider.js'

export const TOKEN = 'GITHUB_TOKEN'

const API = 'https://api.github.com'
const AUTHOR = 'basalte init'

export type Remote = {
  readonly slug: string
  readonly ssh: string
  readonly https: string
}

export function githubToken(environment: Environment): string | undefined {
  const token = (environment[TOKEN] ?? '').trim()

  return token === '' ? undefined : token
}

/** Le `owner/dépôt` d’une adresse GitHub, SSH ou HTTPS, ou rien si ce n’en est pas une. */
export function githubSlug(url: string): string | undefined {
  return /github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?$/.exec(url.trim())?.[1]
}

export function remoteOf(slug: string): Remote {
  return {
    slug,
    ssh: `git@github.com:${slug}.git`,
    https: `https://github.com/${slug}.git`,
  }
}

/**
 * Fait du dossier un dépôt, branche ses hooks, et écrit le premier commit.
 * Le bit exécutable du hook est posé par l’index : il ne se pose pas depuis
 * Windows, et sans lui git ignore le hook sous Linux.
 */
export async function initRepository(
  root: string,
  hooks: readonly string[],
  email: string,
): Promise<void> {
  if (!(await isRepositoryRoot(root))) {
    await expect(root, ['init', '--initial-branch=main'])
  }

  await expect(root, ['config', 'core.hooksPath', '.githooks'])
  await expect(root, ['add', '--all'])

  for (const hook of hooks) {
    await expect(root, ['update-index', '--chmod=+x', '--', hook])
  }

  await expect(root, [
    '-c',
    `user.name=${AUTHOR}`,
    '-c',
    `user.email=${email}`,
    'commit',
    '--no-verify',
    '--message',
    'init : dépôt créé par basalte',
  ])
}

/** Crée le dépôt distant s’il n’existe pas, puis rend son adresse. */
export async function createRemote(
  slug: string,
  token: string,
): Promise<Remote> {
  const [owner, name] = slug.split('/')

  if (owner === undefined || name === undefined) {
    throw new Error(`« ${slug} » n’est pas un dépôt : attendu « compte/nom ».`)
  }

  if (await exists(`${API}/repos/${slug}`, token)) return remoteOf(slug)

  const login = await viewerLogin(token)
  const url =
    owner === login ? `${API}/user/repos` : `${API}/orgs/${owner}/repos`

  await call(url, token, { name, private: true, auto_init: false })

  return remoteOf(slug)
}

export async function attachRemote(
  root: string,
  remote: Remote,
): Promise<void> {
  const existing = await tryGit(root, ['remote', 'get-url', 'origin'])

  await expect(
    root,
    existing.kind === 'done'
      ? ['remote', 'set-url', 'origin', remote.ssh]
      : ['remote', 'add', 'origin', remote.ssh],
  )

  await expect(root, ['push', '--set-upstream', 'origin', 'main'])
}

/**
 * Enregistre une clé de déploiement en écriture, sauf si son empreinte est
 * déjà connue du dépôt : `deploy` se relance sans en accumuler une par appel.
 */
export async function addDeployKey(
  slug: string,
  token: string,
  title: string,
  publicKey: string,
): Promise<boolean> {
  const material = keyMaterial(publicKey)

  const known = (
    await call<readonly { key: string }[]>(`${API}/repos/${slug}/keys`, token)
  ).some((entry) => keyMaterial(entry.key) === material)

  if (known) return false

  await call(`${API}/repos/${slug}/keys`, token, {
    title,
    key: publicKey.trim(),
    read_only: false,
  })

  return true
}

/** Le type et la clé, sans le commentaire : c’est ce qui identifie la clé. */
function keyMaterial(key: string): string {
  return key.trim().split(/\s+/).slice(0, 2).join(' ')
}

async function viewerLogin(token: string): Promise<string> {
  return (await call<{ login: string }>(`${API}/user`, token)).login
}

async function exists(url: string, token: string): Promise<boolean> {
  const response = await fetch(url, { headers: headers(token) })

  return response.ok
}

async function call<T>(url: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: headers(token),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    throw new Error(
      `GitHub a refusé « ${url} » (${response.status}) : ${(await response.text()).slice(0, 200)}`,
    )
  }

  return (await response.json()) as T
}

function headers(token: string): Record<string, string> {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'basalte',
  }
}

async function expect(root: string, args: readonly string[]): Promise<void> {
  const result = await tryGit(root, args)

  if (result.kind === 'failed') {
    throw new Error(`git ${args[0]} a échoué : ${result.detail}`)
  }
}
