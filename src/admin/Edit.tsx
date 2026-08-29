// L’écran d’édition : les pages du site à gauche, leurs sections à droite.
// C’est l’écran par défaut, celui que le client ouvre chaque semaine.

import { Alert, NavLink, Paper, Stack, Text, Title } from '@mantine/core'

import type { PanelPayload } from '../server/panel.js'
import { move, type Draft, type Values } from './draft.js'
import { languageLabel } from './editing.js'
import { FieldSet } from './fields/Field.js'
import { Section } from './Section.js'
import { SortableItem, SortableList } from './Sortable.js'

export function Edit({
  payload,
  selected,
  draft,
  onSelect,
  onDraft,
}: {
  readonly payload: PanelPayload
  readonly selected: string
  readonly draft: Draft
  readonly onSelect: (name: string) => void
  readonly onDraft: (draft: Draft) => void
}) {
  const page = payload.pages.find((entry) => entry.name === selected)

  if (page === undefined) {
    return <Text c="dimmed">Ce site n’a aucune page.</Text>
  }

  const progress = page.progress.filter((entry) => entry.total > 0)

  return (
    <div className="basalte-edit">
      <Stack gap={2} className="basalte-pages">
        {payload.pages.map((entry) => (
          <NavLink
            key={entry.name}
            active={entry.name === selected}
            label={entry.title}
            description={entry.route}
            onClick={() => onSelect(entry.name)}
          />
        ))}
      </Stack>

      <Stack gap="md">
        <div>
          <Title order={3}>{page.title}</Title>
          <Text size="sm" c="dimmed">
            {page.route}
          </Text>
        </div>

        {progress.map((entry) =>
          entry.filled < entry.total ? (
            <Alert key={entry.language} color="yellow" variant="light">
              {languageLabel(payload.site.languages, entry.language)} en
              préparation : {entry.filled} champs traduits sur {entry.total}.
            </Alert>
          ) : null,
        )}

        <Paper withBorder p="md">
          <Stack gap="md">
            <Title order={5}>Informations de la page</Title>
            <FieldSet
              descriptions={payload.meta}
              values={draft.meta as Values}
              onChange={(meta) => onDraft({ ...draft, meta })}
            />
          </Stack>
        </Paper>

        <Title order={5}>Sections</Title>

        <SortableList
          ids={draft.blocks.map((section) => section.id)}
          onMove={(from, to) =>
            onDraft({ ...draft, blocks: move(draft.blocks, from, to) })
          }
        >
          <Stack gap="sm">
            {draft.blocks.map((section, index) => (
              <SortableItem key={section.id} id={section.id}>
                {(handle) => (
                  <Section
                    section={section}
                    type={payload.library.find(
                      (entry) => entry.name === section.type,
                    )}
                    handle={handle}
                    onChange={(next) =>
                      onDraft({
                        ...draft,
                        blocks: draft.blocks.map((current, position) =>
                          position === index ? next : current,
                        ),
                      })
                    }
                  />
                )}
              </SortableItem>
            ))}
          </Stack>
        </SortableList>

        {draft.blocks.length === 0 && (
          <Text c="dimmed" size="sm">
            Cette page n’a pas encore de section. Elles s’ajoutent depuis le
            dépôt, pas depuis le panel.
          </Text>
        )}
      </Stack>
    </div>
  )
}
