// Une section de la page : sa poignée de déplacement, sa visibilité, et le
// formulaire produit par son schéma. Le mot « bloc » n’apparaît nulle part
// devant le client (D25).

import {
  Badge,
  Button,
  Collapse,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import { useState } from 'react'

import type { PageBlock } from '../content/page.js'
import type { PanelBlockType } from '../server/panel.js'
import type { Values } from './draft.js'
import { languageLabel, useEditing } from './editing.js'
import { FieldSet } from './fields/Field.js'
import type { Handle } from './Sortable.js'

export function Section({
  section,
  type,
  handle,
  onChange,
}: {
  readonly section: PageBlock
  readonly type: PanelBlockType | undefined
  readonly handle: Handle
  readonly onChange: (section: PageBlock) => void
}) {
  const editing = useEditing()
  const [open, setOpen] = useState(false)
  const hidden = section.hidden[editing.language] === true
  const several = editing.languages.length > 1

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="sm" wrap="nowrap">
          <button
            type="button"
            className="basalte-handle"
            ref={handle.ref}
            aria-label="Déplacer cette section"
            {...handle.props}
          >
            ⠿
          </button>
          <div>
            <Text fw={600}>{type?.label ?? section.type}</Text>
            {type === undefined && (
              <Text size="xs" c="red">
                Cette section n’existe plus dans le site.
              </Text>
            )}
          </div>
          {hidden && <Badge color="gray">Masquée</Badge>}
        </Group>

        <Group gap="md" wrap="nowrap">
          <Switch
            size="sm"
            checked={!hidden}
            label={
              several
                ? `Visible en ${languageLabel(editing.languages, editing.language)}`
                : 'Visible'
            }
            onChange={(event) =>
              onChange({
                ...section,
                hidden: {
                  ...section.hidden,
                  [editing.language]: !event.currentTarget.checked,
                },
              })
            }
          />
          <Button variant="subtle" size="xs" onClick={() => setOpen(!open)}>
            {open ? 'Replier' : 'Modifier'}
          </Button>
        </Group>
      </Group>

      <Collapse expanded={open}>
        <Stack gap="md" mt="md">
          {type === undefined ? (
            <Text size="sm" c="dimmed">
              Rien à modifier tant que cette section n’est pas rétablie.
            </Text>
          ) : (
            <FieldSet
              descriptions={type.fields}
              values={section.props as Values}
              onChange={(props) => onChange({ ...section, props })}
            />
          )}
        </Stack>
      </Collapse>
    </Paper>
  )
}
