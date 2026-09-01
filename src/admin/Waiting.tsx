// L’attente d’un écran qui va s’écrire. Trois écrans lisent le serveur à
// l’ouverture ; sans elle, l’un ne montrait rien, un autre un en-tête nu, et le
// troisième son état vide — « Aucun appareil retenu » pendant que la requête
// était en vol, ce qui est une phrase fausse.

import { Spinner } from './ui/Button.js'
import { Group } from './ui/Layout.js'
import { Text } from './ui/Text.js'

export function Waiting({ what }: { readonly what: string }) {
  return (
    <Group gap="md">
      <Spinner />
      <Text tone="meta">{what}</Text>
    </Group>
  )
}
