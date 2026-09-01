// Un champ document ne porte qu’une clé de la médiathèque. Le client voit le
// nom du fichier et son poids, jamais l’empreinte qui le nomme sur le disque.

import { Button, Group, Input, Paper, Text } from '@mantine/core'

import { documentWeight } from '../../media/resolve.js'
import { useEditing } from '../editing.js'
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
    <Input.Wrapper
      label={description.label}
      description={hint(description)}
      required={description.required}
      error={error}
    >
      <Paper p="xs" mt={4}>
        <Group wrap="nowrap" align="center">
          {entry === undefined ? (
            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
              Aucun document
            </Text>
          ) : (
            <Text size="sm" style={{ flex: 1 }} lineClamp={2}>
              {entry.name} — {documentWeight(entry.bytes)}
            </Text>
          )}
          <Group gap="xs" wrap="nowrap">
            <Button variant="default" size="xs" onClick={choose}>
              {entry === undefined ? 'Choisir' : 'Remplacer'}
            </Button>
            {entry !== undefined && !description.required && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => onChange('')}
              >
                Retirer
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Input.Wrapper>
  )
}
