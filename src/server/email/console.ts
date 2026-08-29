// Le fournisseur de développement : il n’envoie rien, il écrit. C’est ce qui
// permet de dérouler le flux de connexion en local sans clé d’API.

import type { EmailMessage, EmailProvider } from './provider.js'

export function consoleProvider(
  write: (line: string) => void = (line) => process.stderr.write(line),
): EmailProvider {
  return {
    name: 'console',

    async send(message: EmailMessage): Promise<void> {
      write(
        [
          '',
          '─── email non envoyé (fournisseur « console ») ───',
          `À       : ${message.to}`,
          ...(message.replyTo === undefined
            ? []
            : [`Réponse : ${message.replyTo}`]),
          `Objet   : ${message.subject}`,
          '',
          message.text,
          '───',
          '',
        ].join('\n'),
      )
    },
  }
}
