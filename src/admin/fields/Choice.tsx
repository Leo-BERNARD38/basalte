// Les trois champs à valeur unique et non traduisible : un lien, un choix dans
// une liste fermée, et une date.
//
// La date passe par le champ natif du navigateur plutôt que par un calendrier
// dessiné : un calendrier serait un paquet de plus sur chaque VPS (D57), le
// contrôle natif rend déjà la valeur en « AAAA-MM-JJ » — exactement ce que le
// contenu stocke —, et c’est le seul qui ouvre le sélecteur du téléphone.

import { Field, Select, TextField } from '../ui/Field.js'
import { useFieldError, type ControlProps } from './Field.js'

const EXTERNAL = 'https://exemple.fr'
const INTERNAL = '/contact, https://…, mailto:…'

export function Link({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)

  return (
    <Field
      label={description.label}
      error={error}
      required={description.required}
    >
      {(bound) => (
        <TextField
          {...bound}
          placeholder={description.external === true ? EXTERNAL : INTERNAL}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}

export function Moment({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)

  return (
    <Field
      label={description.label}
      error={error}
      required={description.required}
    >
      {(bound) => (
        <TextField
          {...bound}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}

export function Choice({ description, value, issues, onChange }: ControlProps) {
  const error = useFieldError(issues)
  const current = typeof value === 'string' ? value : ''

  return (
    <Field
      label={description.label}
      error={error}
      required={description.required}
    >
      {(bound) => (
        <Select
          {...bound}
          value={current}
          onChange={(event) => onChange(event.target.value)}
        >
          {/* La ligne vide n’est proposée que là où le vide est une réponse.
              Sur un champ obligatoire encore vide elle reste visible, sans quoi
              le menu afficherait la première option sans qu’on l’ait choisie. */}
          {(!description.required || current === '') && (
            <option value="" disabled={description.required}>
              Aucun choix
            </option>
          )}
          {(description.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}
