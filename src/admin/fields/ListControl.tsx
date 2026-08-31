// Une suite répétable d’un même groupe de champs. C’est le seul endroit où le
// client ajoute et retire quelque chose : il ne crée ni page ni section (D3).
//
// Les éléments sont repliés, un seul ouvert à la fois (D163). Une FAQ de trente
// questions se parcourt alors comme une table des matières : chaque ligne porte
// le champ que le bloc a désigné en `itemLabel` ; à défaut, son rang.
//
// L’ouverture suit l’élément quand la liste se réordonne, jamais son rang.

import { useId, useState } from 'react'
import { Button, Group, Paper, Stack, Text } from '@mantine/core'

import {
  emptyValues,
  indexAfterRemoval,
  labelOfItem,
  move,
  movedIndex,
  remove,
  replace,
} from '../draft.js'
import type { Values } from '../draft.js'
import { useEditing } from '../editing.js'
import { Chevron } from '../Chevron.js'
import { Grip } from '../Grip.js'
import { SortableItem, SortableList } from '../Sortable.js'
import { FieldSet, type ControlProps } from './Field.js'

export function ListControl({ description, value, onChange }: ControlProps) {
  const editing = useEditing()
  const [open, setOpen] = useState<number | null>(null)
  const name = useId()
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
        onMove={(from, to) => {
          onChange(move(items, from, to))
          setOpen(movedIndex(open, from, to))
        }}
      >
        <Stack gap="xs">
          {items.map((item, index) => (
            <SortableItem key={index} id={String(index)}>
              {(handle) => (
                <Paper
                  p="xs"
                  bg="var(--panel-sunken)"
                  shadow="none"
                  radius="md"
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <button
                      type="button"
                      className="basalte-handle"
                      ref={handle.ref}
                      aria-label="Déplacer cet élément"
                      {...handle.props}
                    >
                      <Grip />
                    </button>
                    <button
                      type="button"
                      className="basalte-item"
                      aria-expanded={open === index}
                      aria-controls={`${name}-${index}`}
                      onClick={() => setOpen(open === index ? null : index)}
                    >
                      <span className="basalte-item__label">
                        {labelOfItem(
                          description.itemLabel,
                          item,
                          editing.language,
                        ) || `Élément ${index + 1}`}
                      </span>
                      <Chevron />
                    </button>
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-xs"
                      disabled={scarce}
                      onClick={() => {
                        onChange(remove(items, index))
                        setOpen(indexAfterRemoval(open, index))
                      }}
                    >
                      Retirer
                    </Button>
                  </Group>
                  {open === index && (
                    <Stack gap="sm" mt="sm" id={`${name}-${index}`}>
                      <FieldSet
                        descriptions={fields}
                        values={item}
                        onChange={(next) =>
                          onChange(replace(items, index, next as Values))
                        }
                      />
                    </Stack>
                  )}
                </Paper>
              )}
            </SortableItem>
          ))}
        </Stack>
      </SortableList>

      <Group gap="sm">
        <Button
          variant="default"
          size="xs"
          disabled={full}
          onClick={() => {
            onChange([...items, emptyValues(fields, codes)])
            setOpen(items.length)
          }}
        >
          Ajouter un élément
        </Button>
        {full && (
          <Text size="xs" c="dimmed">
            La mise en page de ce bloc n’en porte pas davantage.
          </Text>
        )}
      </Group>
    </Stack>
  )
}
