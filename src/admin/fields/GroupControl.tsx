// Des champs réunis sous un même intitulé. Un groupe n’est jamais traduisible :
// sa structure est partagée entre les langues (D8).

import { Fieldset, Stack } from '@mantine/core'

import type { Values } from '../draft.js'
import { FieldSet, type ControlProps } from './Field.js'

export function GroupControl({
  description,
  value,
  issues,
  onChange,
}: ControlProps) {
  return (
    <Fieldset legend={description.label} variant="filled">
      <Stack gap="sm">
        <FieldSet
          descriptions={description.fields ?? []}
          values={(value ?? {}) as Values}
          issues={issues}
          onChange={onChange}
        />
      </Stack>
    </Fieldset>
  )
}
