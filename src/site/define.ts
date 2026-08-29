// `site.config.ts` d’un dépôt client passe par ici. La fonction résout ce qui
// est déclaré — langues, tokens — pour que le reste du socle ne travaille
// jamais sur la déclaration brute.

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
  readonly email?: { readonly provider: string }
  readonly leads?: { readonly purgeAfterMonths: number }
}

export type Site = {
  readonly name: string
  readonly domain: string
  readonly languages: Languages
  readonly tokens: Tokens
  readonly email?: { readonly provider: string }
  readonly leads?: { readonly purgeAfterMonths: number }
}

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

  return {
    name: declaration.name.trim(),
    domain: declaration.domain,
    languages: resolveLanguages(declaration.languages),
    tokens: resolveTokens(declaration.tokens),
    ...(declaration.email === undefined ? {} : { email: declaration.email }),
    ...(declaration.leads === undefined ? {} : { leads: declaration.leads }),
  }
}
