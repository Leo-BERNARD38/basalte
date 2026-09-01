// Une suite répétable d’un même groupe de champs. C’est le seul endroit où le
// client ajoute et retire quelque chose : il ne crée ni page ni section (D3).
//
// Les éléments sont repliés, un seul ouvert à la fois (D163). Une FAQ de trente
// questions se parcourt alors comme une table des matières : chaque ligne porte
// le champ que le bloc a désigné en `itemLabel` ; à défaut, son rang.
//
// L’ouverture suit l’élément quand la liste se réordonne, jamais son rang.

import { useId, useState } from 'react'
import { Button, Group, Input, Modal, Paper, Stack, Text } from '@mantine/core'

import {
  emptyValues,
  hasContent,
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
import { below, FieldSet, useFieldError, type ControlProps } from './Field.js'

export function ListControl({
  description,
  value,
  issues,
  onChange,
}: ControlProps) {
  const editing = useEditing()
  const error = useFieldError(issues.filter((issue) => issue.path.length === 0))
  const [open, setOpen] = useState<number | null>(null)
  const [asked, setAsked] = useState<number | null>(null)
  const [flagged, setFlagged] = useState<number | undefined>(undefined)
  const name = useId()
  const fields = description.fields ?? []
  const items = Array.isArray(value) ? (value as Values[]) : []
  const codes = editing.languages.map((language) => language.code)

  const full = description.max !== undefined && items.length >= description.max
  const scarce =
    description.min !== undefined && items.length <= description.min

  const drop = (index: number) => {
    setAsked(null)
    onChange(remove(items, index))
    setOpen(indexAfterRemoval(open, index))
  }

  // Ce qui bloque désigne un rang : l’élément se marque replié, et le premier
  // fautif s’ouvre — le client n’a pas à déplier trente lignes pour le trouver.
  const ranks = issues
    .map((issue) => issue.path[0])
    .filter((segment): segment is number => typeof segment === 'number')
  const wrong = new Set(ranks)
  const first = ranks.toSorted((left, right) => left - right)[0]

  // Une seule fois par verdict : rouvrir à chaque rendu reprendrait la main sur
  // l’élément que le client vient de replier.
  if (flagged !== first) {
    setFlagged(first)

    if (first !== undefined) setOpen(first)
  }

  const named = (index: number) =>
    labelOfItem(description.itemLabel, items[index] ?? {}, editing.language) ||
    `l’élément ${index + 1}`

  return (
    <Input.Wrapper
      label={description.label}
      description={description.help}
      required={description.required}
      error={error}
    >
      <Group justify="flex-end" mb="xs">
        <Text size="xs" c="dimmed">
          {items.length} élément{items.length > 1 ? 's' : ''}
          {description.max === undefined ? '' : ` sur ${description.max}`}
        </Text>
      </Group>

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
                      data-wrong={wrong.has(index)}
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
                      size="xs"
                      disabled={scarce}
                      onClick={() =>
                        hasContent(item) ? setAsked(index) : drop(index)
                      }
                    >
                      Retirer
                    </Button>
                  </Group>
                  {open === index && (
                    <Stack gap="sm" mt="sm" id={`${name}-${index}`}>
                      <FieldSet
                        descriptions={fields}
                        values={item}
                        issues={below(issues, index)}
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

      {/* Un élément rempli ne disparaît pas d’un clic : c’est le seul geste du
          panel qui détruit ce que le client a écrit sans rien enregistrer. */}
      <Modal
        opened={asked !== null}
        onClose={() => setAsked(null)}
        title="Retirer cet élément"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {asked === null ? '' : `« ${named(asked)} »`} sera retiré de la
            liste. L’enregistrement suivant le fera disparaître du site.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAsked(null)}>
              Le garder
            </Button>
            <Button color="red" onClick={() => asked !== null && drop(asked)}>
              Retirer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Group gap="sm" mt="xs">
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
        {scarce && (
          <Text size="xs" c="dimmed">
            Ce bloc en demande au moins {description.min} : « Retirer » attendra
            qu’il y en ait un de plus.
          </Text>
        )}
      </Group>
    </Input.Wrapper>
  )
}
