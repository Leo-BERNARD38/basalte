// Des champs réunis sous un même intitulé. Un groupe n’est jamais traduisible :
// sa structure est partagée entre les langues (D8).
//
// L’intitulé se lit comme une ligne de contexte, et non comme un titre : ce qui
// porte le regard dans une colonne de formulaire, ce sont les libellés des
// champs, et un groupe ne fait que dire ce qu’ils ont en commun.

import type { Values } from '../draft.js'
import { Stack } from '../ui/Layout.js'
import { Card } from '../ui/Surface.js'
import { Eyebrow } from '../ui/Text.js'
import { FieldSet, type ControlProps } from './Field.js'

export function GroupControl({
  description,
  value,
  issues,
  onChange,
}: ControlProps) {
  return (
    <Card nested role="group" aria-label={description.label}>
      <Stack gap="md">
        <Eyebrow>{description.label}</Eyebrow>
        <FieldSet
          descriptions={description.fields ?? []}
          values={(value ?? {}) as Values}
          issues={issues}
          onChange={onChange}
        />
      </Stack>
    </Card>
  )
}
