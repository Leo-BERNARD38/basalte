// Les deux champs à valeur unique et non traduisible : un lien, et un choix
// dans une liste fermée.

import { Select, TextInput } from '@mantine/core'

import { hint, type ControlProps } from './Field.js'

const EXTERNAL = 'https://exemple.fr'
const INTERNAL = '/contact, https://…, mailto:…'

export function Link({ description, value, onChange }: ControlProps) {
  return (
    <TextInput
      label={description.label}
      description={hint(description)}
      required={description.required}
      placeholder={description.external === true ? EXTERNAL : INTERNAL}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

export function Choice({ description, value, onChange }: ControlProps) {
  return (
    <Select
      label={description.label}
      description={hint(description)}
      required={description.required}
      data={(description.options ?? []).map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      value={typeof value === 'string' && value !== '' ? value : null}
      allowDeselect={!description.required}
      onChange={(next) => onChange(next ?? '')}
    />
  )
}
