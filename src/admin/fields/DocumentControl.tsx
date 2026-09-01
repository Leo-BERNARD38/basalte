// Un champ document ne porte qu’une clé de la médiathèque. Le client voit le
// nom du fichier et son poids, jamais l’empreinte qui le nomme sur le disque.

import { documentWeight } from '../../media/resolve.js'
import { useEditing } from '../editing.js'
import { Button } from '../ui/Button.js'
import { Field } from '../ui/Field.js'
import { Group, Spacer } from '../ui/Layout.js'
import { Card } from '../ui/Surface.js'
import { Mono, Text } from '../ui/Text.js'
import { hint, useFieldError, type ControlProps } from './Field.js'

export function DocumentControl({
  description,
  value,
  issues,
  onChange,
}: ControlProps) {
  const error = useFieldError(issues)
  const editing = useEditing()
  const key = typeof value === 'string' ? value : ''
  const entry = editing.documents.find((item) => item.key === key)

  const choose = async () => {
    const chosen = await editing.pickDocument(key)

    if (chosen !== undefined) onChange(chosen)
  }

  return (
    <Field
      label={description.label}
      hint={hint(description)}
      error={error}
      required={description.required}
      group
    >
      {(bound) => (
        <Card nested pad="sm" {...bound}>
          <Group gap="sm">
            {entry === undefined ? (
              <Text tone="meta" size="small">
                Aucun document
              </Text>
            ) : (
              <>
                <Text size="small">{entry.name}</Text>
                <Mono>{documentWeight(entry.bytes)}</Mono>
              </>
            )}
            <Spacer />
            <Button size="xs" onClick={choose}>
              {entry === undefined ? 'Choisir' : 'Remplacer'}
            </Button>
            {entry !== undefined && !description.required && (
              <Button tone="danger" size="xs" onClick={() => onChange('')}>
                Retirer
              </Button>
            )}
          </Group>
        </Card>
      )}
    </Field>
  )
}
