// Le panneau d’une section : ce qu’elle est, si elle est visible, et le
// formulaire produit par son schéma. Le mot « bloc » n’apparaît nulle part
// devant le client (D25).
//
// Le panneau ne montre qu’une section à la fois — celle choisie dans la liste.
// Un accordéon de toutes les sections rendait la page illisible dès qu’elles
// dépassaient la demi-douzaine.

import { Alert, Group, Stack, Switch, Text, Title } from '@mantine/core'

import type { PageBlock } from '../content/page.js'
import type { PanelBlockType } from '../server/panel.js'
import type { Values } from './draft.js'
import { languageLabel, useEditing } from './editing.js'
import { FieldSet, type FieldIssue } from './fields/Field.js'

export function Section({
  section,
  type,
  hideable = true,
  issues,
  onChange,
}: {
  readonly section: PageBlock
  readonly type: PanelBlockType | undefined
  /** L’en-tête et le pied de page sont sur toutes les pages : ils ne se masquent pas. */
  readonly hideable?: boolean
  readonly issues: readonly FieldIssue[]
  readonly onChange: (section: PageBlock) => void
}) {
  const editing = useEditing()
  const hidden = section.hidden[editing.language] === true
  const several = editing.languages.length > 1

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>{type?.label ?? section.type}</Title>
        {type?.help !== undefined && (
          <Text size="sm" c="dimmed">
            {type.help}
          </Text>
        )}
      </div>

      {type === undefined && (
        <Alert color="red" title="Cette section n’existe plus dans le site">
          Rien n’est modifiable tant qu’elle n’est pas rétablie. Le contenu
          qu’elle porte est intact : il reparaîtra avec elle.
        </Alert>
      )}

      {hideable && (
        <Group
          justify="space-between"
          wrap="nowrap"
          p="sm"
          bg="var(--panel-sunken)"
          style={{ borderRadius: 'var(--panel-radius-md)' }}
        >
          <Text fw={600}>
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
      )}

      {type !== undefined && (
        <FieldSet
          descriptions={type.fields}
          values={section.props as Values}
          issues={issues}
          onChange={(props) => onChange({ ...section, props })}
        />
      )}
    </Stack>
  )
}
