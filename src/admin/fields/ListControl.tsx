// Une suite répétable d’un même groupe de champs : le client y ajoute et y
// retire des éléments, comme il ajoute une section ou une page (D179).
//
// Les éléments sont repliés, un seul ouvert à la fois (D163). Une FAQ de trente
// questions se parcourt alors comme une table des matières : chaque ligne porte
// le champ que le bloc a désigné en `itemLabel` ; à défaut, son rang. L’élément
// ouvert garde sa ligne, et ses champs se posent dessous.
//
// L’ouverture suit l’élément quand la liste se réordonne, jamais son rang.

import { useId, useState } from 'react'

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
import { SortableItem, SortableList } from '../Sortable.js'
import { Button } from '../ui/Button.js'
import { Field } from '../ui/Field.js'
import { Chevron, Grip } from '../ui/icons.js'
import { Group, Spacer, Stack } from '../ui/Layout.js'
import { Modal } from '../ui/Overlay.js'
import { Row, RowGlyph, RowText } from '../ui/Row.js'
import { Card } from '../ui/Surface.js'
import { Text } from '../ui/Text.js'
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
    <Field
      label={description.label}
      error={error}
      required={description.required}
      group
    >
      {(bound) => (
        <Stack gap="sm" {...bound}>
          <Group gap="sm">
            <Spacer />
            <Text tone="meta" role="label-md">
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
                    <Stack gap="xs">
                      <Group gap="xs">
                        <button
                          type="button"
                          className="basalte-handle"
                          ref={handle.ref}
                          aria-label="Déplacer cet élément"
                          {...handle.props}
                        >
                          <Grip />
                        </button>
                        <Row
                          current={open === index}
                          wrong={wrong.has(index)}
                          aria-expanded={open === index}
                          aria-controls={`${name}-${index}`}
                          onClick={() => setOpen(open === index ? null : index)}
                        >
                          <RowText>
                            {labelOfItem(
                              description.itemLabel,
                              item,
                              editing.language,
                            ) || `Élément ${index + 1}`}
                          </RowText>
                          <RowGlyph>
                            <Chevron />
                          </RowGlyph>
                        </Row>
                        <Button
                          variant="text"
                          tone="error"
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
                        <Card nested id={`${name}-${index}`}>
                          <Stack gap="md">
                            <FieldSet
                              descriptions={fields}
                              values={item}
                              issues={below(issues, index)}
                              onChange={(next) =>
                                onChange(replace(items, index, next))
                              }
                            />
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  )}
                </SortableItem>
              ))}
            </Stack>
          </SortableList>

          <Group gap="sm">
            <Button
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
              <Text tone="meta" role="label-md">
                La mise en page de ce bloc n’en porte pas davantage.
              </Text>
            )}
            {scarce && (
              <Text tone="meta" role="label-md">
                Ce bloc en demande au moins {description.min} : « Retirer »
                attendra qu’il y en ait un de plus.
              </Text>
            )}
          </Group>

          {/* Un élément rempli ne disparaît pas d’un clic : c’est le seul geste
              du panel qui détruit ce que le client a écrit sans rien
              enregistrer. */}
          <Modal
            opened={asked !== null}
            title="Retirer cet élément"
            onClose={() => setAsked(null)}
            foot={
              <>
                <Spacer />
                <Button onClick={() => setAsked(null)}>Le garder</Button>
                <Button
                  variant="text"
                  tone="error"
                  onClick={() => asked !== null && drop(asked)}
                >
                  Retirer
                </Button>
              </>
            }
          >
            <Text>
              {asked === null ? '' : `« ${named(asked)} »`} sera retiré de la
              liste. L’enregistrement suivant le fera disparaître du site.
            </Text>
          </Modal>
        </Stack>
      )}
    </Field>
  )
}
