// Le panneau d’une section : ce qu’elle est, si elle paraît, et le formulaire
// produit par son schéma. Le mot « bloc » n’apparaît nulle part devant le
// client (D25).
//
// Le panneau ne montre qu’une section à la fois — celle choisie dans la liste.
// Un accordéon de toutes les sections rendait la page illisible dès qu’elles
// dépassaient la demi-douzaine.
//
// Une section masquée se dit par les hachures, comme tout ce qui n’existe pas
// encore sur le site : le bandeau rappelle qu’elle reste modifiable ici.
//
// Le titre de la section suffit à dire ce qu’on remplit. Ce qu’une section
// *fait* se lit au moment où on la choisit, dans la fenêtre d’ajout, et pas
// une fois de plus au-dessus de chaque formulaire : on la connaît, puisqu’on
// vient de la poser.

import type { PageBlock } from '../content/page.js'
import type { PanelBlockType } from '../server/panel.js'
import type { Values } from './draft.js'
import { languageLabel, useEditing } from './editing.js'
import { FieldSet, type FieldIssue } from './fields/Field.js'
import { Button } from './ui/Button.js'
import { Group, Stack } from './ui/Layout.js'
import { Banner } from './ui/Surface.js'
import { Text, Title } from './ui/Text.js'
import { SwitchRow } from './ui/Toggle.js'

export function Section({
  section,
  type,
  hideable = true,
  issues,
  onChange,
  onRemove,
}: {
  readonly section: PageBlock
  readonly type: PanelBlockType | undefined
  /** L’en-tête et le pied de page sont sur toutes les pages : ils ne se masquent pas. */
  readonly hideable?: boolean
  readonly issues: readonly FieldIssue[]
  readonly onChange: (section: PageBlock) => void
  /** Absent sur un emplacement fixe, qui ne se retire pas de sa page. */
  readonly onRemove?: (() => void) | undefined
}) {
  const editing = useEditing()
  const hidden = section.hidden[editing.language] === true
  const several = editing.languages.length > 1

  return (
    <Stack gap="xl">
      <Title role="title-md">{type?.label ?? section.type}</Title>

      {hideable && (
        <SwitchRow
          on={!hidden}
          label={
            several
              ? `Visible en ${languageLabel(editing.languages, editing.language)}`
              : 'Visible sur le site'
          }
          onChange={() =>
            onChange({
              ...section,
              hidden: { ...section.hidden, [editing.language]: !hidden },
            })
          }
        />
      )}

      {type === undefined && (
        <Banner tone="refused">
          <Stack gap="sm">
            <strong>Cette section n’existe plus dans le site</strong>
            <Text tone="muted">
              Rien n’est modifiable tant qu’elle n’est pas rétablie. Le contenu
              qu’elle porte est intact : il reparaîtra avec elle.
            </Text>
          </Stack>
        </Banner>
      )}

      {hideable && hidden && (
        <Banner hatched>
          Cette section n’est pas en ligne
          {several
            ? ` en ${languageLabel(editing.languages, editing.language)}`
            : ''}
          . Elle reste modifiable ici ; le visiteur ne la voit pas.
        </Banner>
      )}

      {type !== undefined && (
        <FieldSet
          descriptions={type.fields}
          values={section.props as Values}
          issues={issues}
          onChange={(props) => onChange({ ...section, props })}
        />
      )}

      {onRemove !== undefined && (
        <Group>
          <Button variant="text" tone="error" onClick={onRemove}>
            Supprimer la section
          </Button>
        </Group>
      )}
    </Stack>
  )
}
