// L’interface d’envoi d’email, et la lecture de ce que `.env` en dit.
//
// Le socle n’appelle jamais un fournisseur directement : il appelle un
// `EmailProvider`. Changer de fournisseur est une ligne de `site.config.ts` et
// une clé dans `.env`, jamais une modification du socle (D13).
//
// Les emails d’authentification empruntent un canal distinct de ceux du
// formulaire de contact : un robot qui épuise le quota du formulaire ne doit
// pas empêcher le client de se connecter. D’où `AUTH_EMAIL_*`, qui l’emporte
// sur `EMAIL_*` quand il est renseigné.

export type EmailMessage = {
  readonly to: string
  readonly subject: string
  readonly text: string
  readonly html: string
}

export type EmailProvider = {
  readonly name: string
  send(message: EmailMessage): Promise<void>
}

export type EmailSettings = {
  readonly provider: string
  readonly key: string
  readonly from: string
  readonly sender: string
}

export type Environment = Readonly<Record<string, string | undefined>>

export const VARIABLES = {
  key: 'EMAIL_API_KEY',
  from: 'EMAIL_FROM',
  admin: 'EMAIL_ADMIN',
  authKey: 'AUTH_EMAIL_API_KEY',
  authFrom: 'AUTH_EMAIL_FROM',
} as const

/**
 * Le canal demandé. `auth` prend les variables `AUTH_EMAIL_*` et retombe sur
 * celles du site ; `site` ne lit que les siennes — une alerte au mainteneur
 * n’a rien à faire sur le canal qui porte les codes de connexion.
 */
export type Channel = 'auth' | 'site'

export function readSettings(
  environment: Environment,
  provider: string,
  sender: string,
  channel: Channel = 'auth',
): EmailSettings {
  const key = environment[VARIABLES.key] ?? ''
  const from = environment[VARIABLES.from] ?? ''

  return channel === 'site'
    ? { provider, sender, key, from }
    : {
        provider,
        sender,
        key: environment[VARIABLES.authKey] ?? key,
        from: environment[VARIABLES.authFrom] ?? from,
      }
}

/** L’adresse où partent les erreurs de la machine (`depot-client.md`). */
export function adminAddress(environment: Environment): string {
  return (environment[VARIABLES.admin] ?? '').trim()
}

export function describeMissing(settings: EmailSettings): string | undefined {
  if (settings.key === '') {
    return `La clé du fournisseur d’email manque : renseigne ${VARIABLES.key} dans .env.`
  }

  if (settings.from === '') {
    return `L’adresse d’expédition manque : renseigne ${VARIABLES.from} dans .env.`
  }

  return undefined
}
