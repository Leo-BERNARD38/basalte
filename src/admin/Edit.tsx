// L’écran d’édition : les sections à gauche, la page au centre, le panneau de
// la section choisie à droite. C’est l’écran par défaut, celui que le client
// ouvre chaque semaine.
//
// L’aperçu n’est plus un bouton mais le centre de l’écran : le client voit la
// page pendant qu’il la modifie. Il montre le dernier enregistrement — c’est
// ce que le dépôt contient, et donc ce qui partira en ligne ; l’en-tête le dit
// tant que des modifications ne sont pas enregistrées.

import {
  ActionIcon,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { useState } from 'react'

import { slugFor } from '../astro/routes.js'
import type { PanelPayload } from '../server/panel.js'
import { move, type Draft, type Values } from './draft.js'
import { pageLabel, useEditing } from './editing.js'
import { FieldSet } from './fields/Field.js'
import { Grip } from './Grip.js'
import { Section } from './Section.js'
import { SortableItem, SortableList } from './Sortable.js'

const PREVIEW = '/admin/preview/'

type Focus =
  { readonly kind: 'meta' } | { readonly kind: 'block'; readonly id: string }

export function Edit({
  payload,
  selected,
  draft,
  savedAt,
  dirty,
  onSelect,
  onDraft,
}: {
  readonly payload: PanelPayload
  readonly selected: string
  readonly draft: Draft
  readonly savedAt: number | undefined
  readonly dirty: boolean
  readonly onSelect: (name: string) => void
  readonly onDraft: (draft: Draft) => void
}) {
  const editing = useEditing()
  const [focus, setFocus] = useState<Focus>({ kind: 'meta' })
  const [viewport, setViewport] = useState('desktop')

  const page = payload.pages.find((entry) => entry.name === selected)

  if (page === undefined) {
    return <Text c="dimmed">Ce site n’a aucune page.</Text>
  }

  const focused =
    focus.kind === 'block'
      ? draft.blocks.find((entry) => entry.id === focus.id)
      : undefined

  return (
    <div className="basalte-edit">
      <Paper className="basalte-rail" p="md">
        <Stack gap="sm">
          {payload.pages.length > 1 && (
            <Select
              size="sm"
              label="Page"
              data={payload.pages.map((entry) => ({
                value: entry.name,
                label: pageLabel(entry.name),
              }))}
              value={selected}
              allowDeselect={false}
              onChange={(value) => value !== null && onSelect(value)}
            />
          )}

          <Group justify="space-between" align="center" px={12}>
            <span className="basalte-eyebrow">Sections</span>
            <Text size="sm" fw={700} c="dimmed">
              {draft.blocks.length}
            </Text>
          </Group>

          <SortableList
            ids={draft.blocks.map((section) => section.id)}
            onMove={(from, to) =>
              onDraft({ ...draft, blocks: move(draft.blocks, from, to) })
            }
          >
            <Stack gap={2}>
              {draft.blocks.map((section) => {
                const type = payload.library.find(
                  (entry) => entry.name === section.type,
                )
                const hidden = section.hidden[editing.language] === true

                return (
                  <SortableItem key={section.id} id={section.id}>
                    {(handle) => (
                      <button
                        type="button"
                        className="basalte-section-row"
                        aria-current={
                          focus.kind === 'block' && focus.id === section.id
                        }
                        data-hidden={hidden}
                        onClick={() =>
                          setFocus({ kind: 'block', id: section.id })
                        }
                      >
                        <span
                          className="basalte-handle"
                          ref={handle.ref}
                          aria-label="Déplacer cette section"
                          {...handle.props}
                        >
                          <Grip />
                        </span>
                        <span className="basalte-section-row__label">
                          {type?.label ?? section.type}
                        </span>
                        {hidden && <HiddenMark />}
                      </button>
                    )}
                  </SortableItem>
                )
              })}
            </Stack>
          </SortableList>

          {draft.blocks.length === 0 && (
            <div className="basalte-empty">
              Cette page n’a pas encore de section. Elles s’ajoutent depuis le
              dépôt, pas depuis le panel.
            </div>
          )}

          <Text size="sm" c="dimmed" px={12}>
            Une section masquée reste dans la liste : c’est le seul endroit d’où
            la rallumer.
          </Text>

          <Button
            variant={focus.kind === 'meta' ? 'light' : 'subtle'}
            color={focus.kind === 'meta' ? 'brand' : 'gray'}
            size="sm"
            mt="auto"
            onClick={() => setFocus({ kind: 'meta' })}
          >
            Informations de la page
          </Button>
        </Stack>
      </Paper>

      <div className="basalte-stage">
        <div className="basalte-stage__head">
          <Text fz="var(--panel-text-title)" fw={700}>
            Aperçu
          </Text>
          <SegmentedControl
            size="xs"
            radius="xl"
            ml="auto"
            value={viewport}
            onChange={setViewport}
            data={[
              { value: 'desktop', label: 'Bureau' },
              { value: 'mobile', label: 'Mobile' },
            ]}
          />
          <ActionIcon
            component="a"
            href={previewAddress(page.route, editing)}
            target="_blank"
            rel="noopener"
            size="lg"
            aria-label="Ouvrir l’aperçu dans un onglet"
          >
            ↗
          </ActionIcon>
        </div>

        {dirty && (
          <Text size="sm" c="dimmed">
            L’aperçu montre le dernier enregistrement. Enregistrez pour le voir
            se mettre à jour.
          </Text>
        )}

        <iframe
          key={savedAt ?? 0}
          className="basalte-stage__frame"
          data-viewport={viewport}
          title="Aperçu de la page"
          src={previewAddress(page.route, editing)}
        />
      </div>

      <Paper className="basalte-inspector" p="md">
        <Stack gap="md">
          {focus.kind === 'meta' ? (
            <>
              <div>
                <Text fz="var(--panel-text-title)" fw={700}>
                  Informations de la page
                </Text>
                <Text size="sm" c="dimmed">
                  {page.route}
                </Text>
              </div>
              <FieldSet
                descriptions={payload.meta}
                values={draft.meta as Values}
                onChange={(meta) => onDraft({ ...draft, meta })}
              />
            </>
          ) : focused === undefined ? (
            <div className="basalte-empty">
              Cette section n’existe plus dans la page.
            </div>
          ) : (
            <Section
              section={focused}
              type={payload.library.find(
                (entry) => entry.name === focused.type,
              )}
              onChange={(next) =>
                onDraft({
                  ...draft,
                  blocks: draft.blocks.map((current) =>
                    current.id === next.id ? next : current,
                  ),
                })
              }
            />
          )}
        </Stack>
      </Paper>
    </div>
  )
}

/** L’adresse de l’aperçu : la route de la page, préfixée si la langue n’est pas celle par défaut. */
function previewAddress(
  route: string,
  editing: {
    readonly language: string
    readonly languages: readonly {
      readonly code: string
      readonly default?: boolean
    }[]
  },
): string {
  const fallback = editing.languages.find((entry) => entry.default)?.code ?? ''
  const prefix = editing.language === fallback ? '' : editing.language

  return `${PREVIEW}${slugFor(route, prefix) ?? ''}`
}

function HiddenMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Masquée"
      role="img"
    >
      <path d="M4.2 6.3C2.7 7.6 1.8 10 1.8 10s3.1 5.5 8.2 5.5c1.3 0 2.4-.3 3.4-.8" />
      <path d="M8.1 5c.6-.3 1.2-.5 1.9-.5 5.1 0 8.2 5.5 8.2 5.5s-.8 1.4-2.1 2.8" />
      <path d="m3 3 14 14" />
    </svg>
  )
}
