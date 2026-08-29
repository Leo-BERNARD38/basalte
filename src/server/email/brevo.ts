// Le fournisseur par défaut : l’API transactionnelle de Brevo, appelée par
// `fetch`. Aucun SDK — la requête tient en un objet JSON, et une dépendance de
// moins est une dépendance de moins sur chaque VPS.

import type { EmailMessage, EmailProvider, EmailSettings } from './provider.js'

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export function brevoProvider(settings: EmailSettings): EmailProvider {
  return {
    name: 'brevo',

    async send(message: EmailMessage): Promise<void> {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': settings.key,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: settings.sender, email: settings.from },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Brevo a refusé l’envoi (${response.status}) : ${(await response.text()).slice(0, 200)}`,
        )
      }
    },
  }
}
