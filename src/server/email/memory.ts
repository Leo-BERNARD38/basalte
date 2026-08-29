// Le fournisseur qui retient au lieu d’envoyer : `basalte doctor` s’en sert
// pour prouver un rendu sans consommer de quota, et les tests pour lire ce
// qu’un email contient vraiment.

import type { EmailMessage, EmailProvider } from './provider.js'

export type MemoryProvider = EmailProvider & {
  readonly sent: readonly EmailMessage[]
  last(): EmailMessage | undefined
}

export function memoryProvider(): MemoryProvider {
  const sent: EmailMessage[] = []

  return {
    name: 'memory',
    sent,

    async send(message: EmailMessage): Promise<void> {
      sent.push(message)
    },

    last(): EmailMessage | undefined {
      return sent.at(-1)
    },
  }
}
