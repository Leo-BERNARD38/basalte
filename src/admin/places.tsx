// Où un média sert dans le site, entrée par entrée — et les lignes qui y
// mènent.
//
// Le serveur ne rend que le nombre d’emplois, et un nombre ne mène nulle part.
// Le panel, lui, a déjà sous la main les pages, les billets, les deux entrées
// qui n’en sont pas, et la description des champs de chaque section : le même
// parcours dit donc où une image est posée, et la ligne y mène.

import type { FieldDescription } from '../fields/describe.js'
import type { PanelPayload } from '../server/panel.js'
import { asidesOf } from './asides.js'
import { ChevronRight } from './ui/icons.js'
import { Stack } from './ui/Layout.js'
import { Row, RowGlyph, RowText } from './ui/Row.js'
import { Eyebrow, Text } from './ui/Text.js'

export type Place = {
  /** L’entrée à ouvrir : une page, l’en-tête et le pied, ou un billet. */
  readonly entry: string
  readonly label: string
  readonly kind: 'page' | 'post'
}

export function placesOf(
  payload: PanelPayload,
  key: string,
  kind: 'image' | 'document' = 'image',
): readonly Place[] {
  if (key === '') return []

  const places: Place[] = []
  const library = new Map(
    payload.library.map((type) => [type.name, type.fields]),
  )

  for (const page of payload.pages) {
    const here =
      used(payload.meta, page.meta, kind, key) ||
      page.blocks.some((section) =>
        used(library.get(section.type) ?? [], section.props, kind, key),
      )

    if (here) places.push({ entry: page.name, label: page.title, kind: 'page' })
  }

  for (const aside of asidesOf(payload)) {
    const types = new Map(aside.types.map((type) => [type.name, type.fields]))

    const here = aside.sections.some((section) =>
      used(types.get(section.type) ?? [], section.props, kind, key),
    )

    if (here) {
      places.push({ entry: aside.entry, label: aside.title, kind: 'page' })
    }
  }

  const journal = payload.journal

  if (journal !== undefined) {
    for (const post of journal.posts) {
      if (used(journal.fields, post.fields, kind, key)) {
        places.push({ entry: post.slug, label: post.title, kind: 'post' })
      }
    }
  }

  return places
}

/** La clé est-elle posée quelque part sous ces champs, si loin soit-elle ? */
function used(
  fields: readonly FieldDescription[],
  values: unknown,
  kind: 'image' | 'document',
  key: string,
): boolean {
  const record = values as Record<string, unknown> | undefined

  return fields.some((field) => {
    const value = record?.[field.name]

    if (field.kind === 'group') {
      return used(field.fields ?? [], value, kind, key)
    }

    if (field.kind === 'list') {
      return (
        Array.isArray(value) &&
        value.some((item) => used(field.fields ?? [], item, kind, key))
      )
    }

    return field.kind === kind && value === key
  })
}

/** Les entrées où le média est posé, chacune menant à ce qu’elle nomme. */
export function Places({
  title = 'Utilisée dans',
  places,
  none,
  onOpen,
}: {
  readonly title?: string | undefined
  readonly places: readonly Place[]
  /** Ce qui se lit quand rien ne l’emploie : l’absence se dit, elle aussi. */
  readonly none: string
  readonly onOpen: (place: Place) => void
}) {
  return (
    <Stack gap="sm">
      <Eyebrow>{title}</Eyebrow>
      {places.length === 0 ? (
        <Text tone="meta" role="label-md">
          {none}
        </Text>
      ) : (
        <Stack gap="xs">
          {places.map((place) => (
            <Row
              key={`${place.kind}-${place.entry}`}
              onClick={() => onOpen(place)}
            >
              <RowText>{place.label}</RowText>
              <RowGlyph>
                <ChevronRight />
              </RowGlyph>
            </Row>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
