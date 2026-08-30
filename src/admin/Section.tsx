// Le panneau d’une section : ce qu’elle est, si elle est visible, et le
// formulaire produit par son schéma. Le mot « bloc » n’apparaît nulle part
// devant le client (D25).
//
// Le panneau ne montre qu’une section à la fois — celle choisie dans la liste.
// Un accordéon de toutes les sections rendait la page illisible dès qu’elles
// dépassaient la demi-douzaine.

import { Group, Stack, Switch, Text } from '@mantine/core'

import type { PageBlock } from '../content/page.js'
import type { PanelBlockType } from '../server/panel.js'
import type { Values } from './draft.js'
import { languageLabel, useEditing } from './editing.js'
import { FieldSet } from './fields/Field.js'

export function Section({
  section,
  type,
  onChange,
}: {
  readonly section: PageBlock
  readonly type: PanelBlockType | undefined
  readonly onChange: (section: PageBlock) => void
}) {
  const editing = useEditing()
  const hidden = section.hidden[editing.language] === true
  const several = editing.languages.length > 1

  return (
    <Stack gap="md">
      <div>
        <Text fz="var(--panel-text-title)" fw={700}>
          {type?.label ?? section.type}
        </Text>
        {type === undefined ? (
          <Text size="sm" c="red">
            Cette section n’existe plus dans le site.
          </Text>
        ) : (
          type.help !== undefined && (
            <Text size="sm" c="dimmed">
              {type.help}
            </Text>
          )
        )}
      </div>

      <Group
        justify="space-between"
        wrap="nowrap"
        p="sm"
        bg="var(--panel-sunken)"
        style={{ borderRadius: 'var(--panel-radius-md)' }}
      >
        <Text size="md" fw={600}>
          {several
            ? `Visible en ${languageLabel(editing.languages, editing.language)}`
            : 'Visible'}
        </Text>
        <Switch
          checked={!hidden}
          aria-label="Visibilité de cette section"
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
      </Group>

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
  )
}
