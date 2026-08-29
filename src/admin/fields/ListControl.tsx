// Une suite répétable d’un même groupe de champs. C’est le seul endroit où le
// client ajoute et retire quelque chose : il ne crée ni page ni section (D3).
//
// Un élément se nomme par le champ que le bloc a désigné en `itemLabel` ; à
// défaut, par son rang.

import { Button, Group, Paper, Stack, Text } from '@mantine/core'

import { emptyValues, move, remove, replace, translated } from '../draft.js'
import type { Values } from '../draft.js'
import { useEditing } from '../editing.js'
import { SortableItem, SortableList } from '../Sortable.js'
import { FieldSet, type ControlProps } from './Field.js'

export function ListControl({ description, value, onChange }: ControlProps) {
  const editing = useEditing()
  const fields = description.fields ?? []
  const items = Array.isArray(value) ? (value as Values[]) : []
  const codes = editing.languages.map((language) => language.code)

  const full = description.max !== undefined && items.length >= description.max
  const scarce =
    description.min !== undefined && items.length <= description.min

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Text fw={500} size="sm">
          {description.label}
          {description.required && ' *'}
        </Text>
        <Text size="xs" c="dimmed">
          {items.length} élément{items.length > 1 ? 's' : ''}
          {description.max === undefined ? '' : ` sur ${description.max}`}
        </Text>
      </Group>

      {description.help !== undefined && (
        <Text size="xs" c="dimmed">
          {description.help}
        </Text>
      )}

      <SortableList
        ids={items.map((_, index) => String(index))}
        onMove={(from, to) => onChange(move(items, from, to))}
      >
        <Stack gap="xs">
          {items.map((item, index) => (
            <SortableItem key={index} id={String(index)}>
              {(handle) => (
                <Paper withBorder p="sm">
                  <Group justify="space-between" mb="xs" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <button
                        type="button"
                        className="basalte-handle"
                        ref={handle.ref}
                        aria-label="Déplacer cet élément"
                        {...handle.props}
                      >
                        ⠿
                      </button>
                      <Text fw={500} size="sm">
                        {itemLabel(
                          description.itemLabel,
                          item,
                          editing.language,
                        ) || `Élément ${index + 1}`}
                      </Text>
                    </Group>
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-xs"
                      disabled={scarce}
                      onClick={() => onChange(remove(items, index))}
                    >
                      Retirer
                    </Button>
                  </Group>
                  <Stack gap="sm">
                    <FieldSet
                      descriptions={fields}
                      values={item}
                      onChange={(next) =>
                        onChange(replace(items, index, next as Values))
                      }
                    />
                  </Stack>
                </Paper>
              )}
            </SortableItem>
          ))}
        </Stack>
      </SortableList>

      <Group>
        <Button
          variant="default"
          size="xs"
          disabled={full}
          onClick={() => onChange([...items, emptyValues(fields, codes)])}
        >
          Ajouter un élément
        </Button>
      </Group>
    </Stack>
  )
}

function itemLabel(
  name: string | undefined,
  item: Values,
  language: string,
): string {
  if (name === undefined) return ''

  const value = item[name]

  if (typeof value === 'string') return value

  return translated(value, language)
}
