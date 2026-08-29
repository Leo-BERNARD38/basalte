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
  authKey: 'AUTH_EMAIL_API_KEY',
  authFrom: 'AUTH_EMAIL_FROM',
} as const

export function readSettings(
  environment: Environment,
  provider: string,
  sender: string,
): EmailSettings {
  return {
    provider,
    sender,
    key: environment[VARIABLES.authKey] ?? environment[VARIABLES.key] ?? '',
    from: environment[VARIABLES.authFrom] ?? environment[VARIABLES.from] ?? '',
  }
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
