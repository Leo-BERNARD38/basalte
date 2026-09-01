// L’attente d’un écran qui va s’écrire. Trois écrans lisent le serveur à
// l’ouverture ; sans elle, l’un ne montrait rien, un autre un en-tête nu, et le
// troisième son état vide — « Aucun appareil retenu » pendant que la requête
// était en vol, ce qui est une phrase fausse.

import { Center, Loader, Text, Stack } from '@mantine/core'

export function Waiting({ what }: { readonly what: string }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          {what}
        </Text>
      </Stack>
    </Center>
  )
}
