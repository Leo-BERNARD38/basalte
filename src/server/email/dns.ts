// Ce qu’il faut publier dans le DNS pour qu’un email **arrive**, et comment le
// lire dans des enregistrements TXT.
//
// `basalte doctor` prouve qu’un email part (D30, D93) : la clé est bonne, le
// fournisseur l’accepte. Rien ne disait qu’il arrive — et l’absence de ces
// enregistrements explique l’essentiel des messages classés en spam. Ici, ce
// n’est pas un confort : l’email porte aussi les codes de connexion (D9), et un
// code en spam est un client enfermé dehors.
//
// **Ce qui authentifie dépend du fournisseur, et il faut le lui demander.**
// Brevo expédie sous son propre domaine d’enveloppe : le SPF du client n’est
// donc jamais aligné, et sa documentation dit de ne pas en ajouter un pour lui.
// C’est **DKIM** qui signe, et c’est par DKIM que DMARC s’aligne. Le SPF garde
// sa valeur générale — un domaine qui n’en a aucun est moins bien reçu — mais
// il n’est pas ce qui manque quand un email de Brevo tombe en spam.
//
// Le sélecteur DKIM, lui, dépend du compte : le socle connaît ceux que Brevo
// distribue, et un site qui en a un autre le déclare dans `site.config.ts`.
// Deviner sans le dire ferait une sonde qui refuse un site correct, ce qui est
// pire que pas de sonde.
//
// Le module ne résout rien : il lit des enregistrements qu’on lui donne. C’est
// ce qui rend les sondes éprouvables sans réseau.

import type { Environment } from './provider.js'
import { VARIABLES } from './provider.js'

export type ProviderDns = {
  /** Le mécanisme que ce fournisseur ajoute à un SPF, quand il en demande un. */
  readonly spf?: string
  /** Les sélecteurs DKIM qu’il distribue, du plus ancien au plus récent. */
  readonly dkimSelectors: readonly string[]
}

// Brevo, et lui seul, parce qu’il est le seul fournisseur du socle (D13). Les
// valeurs viennent de sa documentation d’authentification de domaine : deux
// sélecteurs sur les comptes récents, `mail` sur les plus anciens.
const BREVO: ProviderDns = {
  spf: 'spf.brevo.com',
  dkimSelectors: ['brevo1', 'brevo2', 'mail'],
}

const KNOWN: Readonly<Record<string, ProviderDns>> = { brevo: BREVO }

/** Ce que ce fournisseur attend, ou rien quand le socle ne le connaît pas. */
export function providerDns(provider: string): ProviderDns | undefined {
  return KNOWN[provider]
}

/**
 * Les domaines qui expédient. C’est le domaine de l’adresse d’envoi qui porte
 * ces enregistrements, pas celui du site : les deux coïncident souvent, et
 * quand ils diffèrent, c’est le premier qui compte. Le canal des codes de
 * connexion est sondé à part quand il expédie d’ailleurs (D75).
 */
export function sendingDomains(environment: Environment): readonly string[] {
  const found = [VARIABLES.from, VARIABLES.authFrom]
    .map((name) => domainOf(environment[name] ?? ''))
    .filter((domain) => domain !== '')

  return [...new Set(found)]
}

export function domainOf(address: string): string {
  const clean = address.trim()
  const at = clean.lastIndexOf('@')

  return at === -1 ? '' : clean.slice(at + 1).toLowerCase()
}

/** Le nom à interroger pour un sélecteur DKIM. */
export function dkimHost(domain: string, selector: string): string {
  return `${selector}._domainkey.${domain}`
}

export function dmarcHost(domain: string): string {
  return `_dmarc.${domain}`
}

export type SpfVerdict =
  | { readonly kind: 'absent' }
  | { readonly kind: 'found'; readonly record: string; readonly names: boolean }

/**
 * L’enregistrement SPF du domaine. `names` dit si le fournisseur y figure
 * littéralement — une délégation par `include:` ou `redirect=` peut l’y mettre
 * sans qu’une seule requête le voie, d’où un constat plutôt qu’un verdict.
 */
export function readSpf(
  records: readonly string[],
  expected?: ProviderDns,
): SpfVerdict {
  const record = records.find((entry) =>
    entry.toLowerCase().startsWith('v=spf1'),
  )

  if (record === undefined) return { kind: 'absent' }

  const mechanism = expected?.spf

  return {
    kind: 'found',
    record,
    names: mechanism !== undefined && record.toLowerCase().includes(mechanism),
  }
}

/** Vrai dès qu’un enregistrement porte une clé DKIM publiée. */
export function readDkim(records: readonly string[]): boolean {
  return records.some((entry) => entry.toLowerCase().includes('v=dkim1'))
}

export type DmarcVerdict =
  | { readonly kind: 'absent' }
  | { readonly kind: 'found'; readonly policy: string }

export function readDmarc(records: readonly string[]): DmarcVerdict {
  const record = records.find((entry) =>
    entry.toLowerCase().startsWith('v=dmarc1'),
  )

  if (record === undefined) return { kind: 'absent' }

  const policy = /(?:^|;)\s*p\s*=\s*([a-z]+)/i.exec(record)

  return { kind: 'found', policy: policy?.[1]?.toLowerCase() ?? 'none' }
}
