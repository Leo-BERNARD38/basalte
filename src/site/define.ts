// `site.config.ts` d’un dépôt client passe par ici. La fonction résout ce qui
// est déclaré — langues, tokens — pour que le reste du socle ne travaille
// jamais sur la déclaration brute.

import {
  resolveJournal,
  type Journal,
  type JournalDeclaration,
} from '../journal/define.js'
import { checkRedirects, type Redirects } from '../seo/redirects.js'
import {
  resolveCapabilities,
  type CapabilityOverrides,
  type Capabilities,
} from './capabilities.js'
import {
  resolveLanguages,
  type LanguageDeclaration,
  type Languages,
} from './languages.js'
import { resolveTokens, type TokenOverrides, type Tokens } from './tokens.js'

export type SiteDeclaration = {
  readonly name: string
  readonly domain: string
  readonly languages: Readonly<Record<string, LanguageDeclaration>>
  readonly tokens?: TokenOverrides
  readonly capabilities?: CapabilityOverrides
  /** Les anciennes adresses du site, et où elles mènent désormais. */
  readonly redirects?: Redirects
  /**
   * Le journal du site. La clé absente veut dire qu’il n’en a pas : ni onglet
   * dans le panel, ni adresse de billet, ni flux. Elle n’est pas une capacité
   * parce qu’elle porte un segment d’adresse, là où `capabilities` est une
   * liste fermée de booléens.
   */
  readonly journal?: JournalDeclaration
  readonly email?: EmailDeclaration
  readonly leads?: { readonly purgeAfterMonths: number }
  /**
   * La couleur dont le panel tire son schéma (D195). Absente, le panel est
   * neutre : c’est une graine choisie pour l’outil, jamais l’accent du site —
   * la direction artistique d’un client ne décide pas de la lisibilité de son
   * outil de travail (D65).
   */
  readonly panel?: PanelDeclaration
}

export type PanelDeclaration = {
  /** Un « #rrggbb ». */
  readonly seed?: string
}

/**
 * Le fournisseur d’email, et les sélecteurs DKIM que le domaine publie. Les
 * seconds ne sont utiles qu’à `basalte doctor` : il connaît ceux que le
 * fournisseur distribue, et c’est ici qu’un compte au sélecteur inhabituel le
 * dit plutôt que de faire échouer la sonde.
 */
export type EmailDeclaration = {
  readonly provider: string
  readonly dkim?: readonly string[]
}

export type Site = {
  readonly name: string
  readonly domain: string
  readonly languages: Languages
  readonly tokens: Tokens
  readonly capabilities: Capabilities
  readonly redirects: Redirects
  readonly journal?: Journal
  readonly email?: EmailDeclaration
  readonly leads?: { readonly purgeAfterMonths: number }
  readonly panel?: { readonly seed: string }
}

const SEED = /^#[0-9a-f]{6}$/i

const DOMAIN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export function defineSite(declaration: SiteDeclaration): Site {
  if (declaration.name.trim() === '') {
    throw new Error('Le nom du site ne peut pas être vide.')
  }

  if (!DOMAIN.test(declaration.domain)) {
    throw new Error(
      `« ${declaration.domain} » n’est pas un domaine : attendu « exemple.fr », sans schéma ni chemin.`,
    )
  }

  const redirects = declaration.redirects ?? {}

  checkRedirects(redirects)

  const journal = resolveJournal(declaration.journal)
  const panel = resolvePanel(declaration.panel)

  return {
    name: declaration.name.trim(),
    domain: declaration.domain,
    languages: resolveLanguages(declaration.languages),
    tokens: resolveTokens(declaration.tokens),
    capabilities: resolveCapabilities(declaration.capabilities),
    redirects,
    ...(journal === undefined ? {} : { journal }),
    ...(declaration.email === undefined ? {} : { email: declaration.email }),
    ...(declaration.leads === undefined ? {} : { leads: declaration.leads }),
    ...(panel === undefined ? {} : { panel }),
  }
}

function resolvePanel(
  declaration: PanelDeclaration | undefined,
): { readonly seed: string } | undefined {
  if (declaration?.seed === undefined) return undefined

  if (!SEED.test(declaration.seed)) {
    throw new Error(
      `« ${declaration.seed} » n’est pas une couleur de graine : attendu « #rrggbb ».`,
    )
  }

  return { seed: declaration.seed.toLowerCase() }
}
