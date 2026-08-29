// Le socle HTTP partagé par les routes du panel : la forme d’une réponse
// JSON, la lecture d’un corps, et les gardes qui arrêtent le CSRF (D52).
//
// Les deux gardes ne se remplacent pas l’une l’autre. Un formulaire hébergé
// ailleurs peut annoncer « multipart/form-data », jamais « application/json » :
// un téléversement ne peut donc être protégé que par l’origine, et c’est
// `SameSite=Strict` qui retient le cookie de session.

import type { z } from 'zod'

import type { Origin } from './session.js'

const AGENT_LENGTH = 200

export function json(
  body: unknown,
  status = 200,
  cookies: readonly string[] = [],
): Response {
  const headers: [string, string][] = [
    ['content-type', 'application/json; charset=utf-8'],
    ['cache-control', 'no-store'],
  ]

  for (const cookie of cookies) headers.push(['set-cookie', cookie])

  return new Response(JSON.stringify(body), { status, headers })
}

/** L’origine déclarée doit désigner le même hôte que la requête. */
export function guardOrigin(request: Request): Response | undefined {
  const declared = request.headers.get('origin')

  if (declared === null || !sameHost(declared, request.url)) {
    return json({ ok: false, message: 'Requête refusée.' }, 403)
  }

  return undefined
}

/** L’origine, plus un corps annoncé en JSON. */
export function guardWrite(request: Request): Response | undefined {
  const type = request.headers.get('content-type') ?? ''

  if (!type.startsWith('application/json')) {
    return json({ ok: false, message: 'Corps de requête inattendu.' }, 415)
  }

  return guardOrigin(request)
}

function sameHost(declared: string, target: string): boolean {
  try {
    return new URL(declared).host === new URL(target).host
  } catch {
    return false
  }
}

export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  try {
    const parsed = schema.safeParse(await request.json())

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export function originOf(request: Request): Origin {
  return {
    ip: clientAddress(request),
    agent: (request.headers.get('user-agent') ?? '').slice(0, AGENT_LENGTH),
  }
}

// Caddy ajoute l’adresse du visiteur à la fin de `X-Forwarded-For` : c’est
// donc la dernière entrée qui vient du proxy, et les précédentes qui viennent
// du client.
function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')

  if (forwarded === null) return ''

  return forwarded.split(',').at(-1)?.trim() ?? ''
}

/**
 * Vrai quand la requête annonce une longueur, et qu’elle tient sous la borne.
 *
 * Un corps de formulaire est mis en mémoire en entier par `formData` : sa
 * taille se refuse donc avant la lecture. Ne rien annoncer est refusé de la
 * même façon — un navigateur annonce toujours la longueur d’un formulaire, et
 * l’omettre est le moyen de faire lire sans limite. `Number(null)` valant zéro,
 * l’en-tête absent se teste pour lui-même, jamais par sa conversion.
 */
export function withinLength(request: Request, limit: number): boolean {
  const announced = request.headers.get('content-length')

  if (announced === null) return false

  const bytes = Number(announced)

  return Number.isInteger(bytes) && bytes >= 0 && bytes <= limit
}

export function badRequest(): Response {
  return json({ ok: false, message: 'Formulaire incomplet.' }, 400)
}

export function refuseMethod(): Response {
  return json({ ok: false, message: 'Méthode refusée.' }, 405)
}

export function refuseAnonymous(): Response {
  return json({ ok: false, signedIn: false }, 401)
}
