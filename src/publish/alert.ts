// L’avertissement du mainteneur. Le client lit une phrase qui ne l’inquiète
// pas ; l’erreur entière part ici.
//
// Elle emprunte le canal du site, pas celui des codes de connexion : une
// alerte qui épuiserait le quota d’authentification enfermerait dehors la
// seule personne capable de réparer.
//
// Sans adresse ni fournisseur configurés, elle s’écrit sur la sortie d’erreur —
// visible dans les journaux du conteneur, et suffisant en local.

import type { EmailProvider } from '../server/email/provider.js'
import type { Letter } from '../server/email/messages.js'

export type Alert = (letter: Letter) => Promise<void>

export function alertMaintainer(parts: {
  readonly to: string
  readonly provider?: EmailProvider | undefined
}): Alert {
  return async (letter) => {
    if (parts.to === '' || parts.provider === undefined) {
      return written(letter)
    }

    try {
      await parts.provider.send({ to: parts.to, ...letter })
    } catch (cause) {
      process.stderr.write(
        `L’alerte n’est pas partie : ${(cause as Error).message}\n`,
      )

      written(letter)
    }
  }
}

function written(letter: Letter): void {
  process.stderr.write(
    ['', `─── ${letter.subject} ───`, letter.text, '───', ''].join('\n'),
  )
}
