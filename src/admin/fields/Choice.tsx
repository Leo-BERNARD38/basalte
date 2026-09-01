// Les trois champs à valeur unique et non traduisible : un lien, un choix dans
// une liste fermée, et une date.
//
// La date passe par le champ natif du navigateur plutôt que par un calendrier
// dessiné : `@mantine/dates` serait un paquet de plus sur chaque VPS (D57), le
// contrôle natif rend déjà la valeur en « AAAA-MM-JJ » — exactement ce que le
// contenu stocke —, et c’est le seul qui ouvre le sélecteur du téléphone.

import { Select, TextInput } from '@mantine/core'

import { hint, useFieldError, type ControlProps } from './Field.js'

const EXTERNAL = 'https://exemple.fr'
const INTERNAL = '/contact, https://…, mailto:…'

export function Link({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)

  return (
    <TextInput
      label={description.label}
      description={hint(description)}
      required={description.required}
      error={error}
      placeholder={description.external === true ? EXTERNAL : INTERNAL}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

export function Moment({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)

  return (
    <TextInput
      type="date"
      label={description.label}
      description={hint(description)}
      required={description.required}
      error={error}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

export function Choice({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)

  return (
    <Select
      label={description.label}
      description={hint(description)}
      required={description.required}
      error={error}
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
