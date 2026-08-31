// L’écran d’édition : les sections à gauche, la page au centre, le panneau de
// la section choisie à droite. C’est l’écran par défaut, celui que le client
// ouvre chaque semaine.
//
// L’aperçu n’est plus un bouton mais le centre de l’écran : le client voit la
// page pendant qu’il la modifie. Il montre le dernier enregistrement — c’est
// ce que le dépôt contient, et donc ce qui partira en ligne ; l’en-tête le dit
// tant que des modifications ne sont pas enregistrées.
//
// La bascule bureau / mobile ne fait pas que redimensionner le cadre : elle
// demande le rendu du support à l’aperçu, qui les sert tous les deux. Sur un
// site à un seul rendu elle ne change donc que la largeur, ce qui est déjà ce
// qu’elle faisait — et c’est ce qui la laisse inchangée aux yeux du client
// (D25).
//
// La liste porte aussi ce que le client ne peut pas faire (D3), et à qui le
// demander. Le dire là où la limite se rencontre vaut mieux qu’un écran d’aide
// qui n’existera pas (D63) : c’est en cherchant « ajouter une section » qu’on a
// besoin de la réponse.

import {
  ActionIcon,
  Anchor,
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
import { asideOf, asidesOf } from './asides.js'
import { pageLabel } from '../content/naming.js'
import { DEFAULT_SUPPORT, SUPPORT_PARAM } from '../render/supports.js'
import type { PanelPayload } from '../server/panel.js'
import { move, type Draft, type Values } from './draft.js'
import { useEditing } from './editing.js'
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
  const [opened, setOpened] = useState<string>(selected)
  const [viewport, setViewport] = useState<string>('desktop')

  // Le chrome et la fiche d’entreprise s’ouvrent ici comme des pages : ils
  // portent des sections, sans route ni métadonnées.
  const aside = asideOf(payload, selected)
  const fixed = aside !== undefined

  // Le panneau de droite suit la page ouverte : sans cette remise à zéro,
  // passer d’une page au chrome laisserait un identifiant de section que la
  // nouvelle liste ne porte pas, et le panneau dirait qu’elle a disparu.
  if (opened !== selected) {
    setOpened(selected)
    setFocus(
      aside === undefined
        ? { kind: 'meta' }
        : { kind: 'block', id: aside.sections[0]?.id ?? '' },
    )
  }
  const page = payload.pages.find((entry) => entry.name === selected)

  if (!fixed && page === undefined) {
    return <Text c="dimmed">Ce site n’a aucune page.</Text>
  }

  // Le chrome se règle en regardant l’accueil : c’est là qu’il se voit en
  // entier, et le client n’a pas à savoir qu’il est sur toutes les pages.
  const previewed = page?.route ?? '/'

  // La bibliothèque des sections d’une page, ou les emplacements d’une entrée
  // fixe : dans les deux cas, un descripteur par type.
  const types = aside?.types ?? payload.library

  // Une entrée fixe n’a pas de métadonnées : son panneau ouvre sur le premier
  // emplacement plutôt que sur un formulaire qui n’existe pas.
  const active: Focus =
    fixed && focus.kind === 'meta'
      ? { kind: 'block', id: draft.blocks[0]?.id ?? '' }
      : focus

  const focused =
    active.kind === 'block'
      ? draft.blocks.find((entry) => entry.id === active.id)
      : undefined

  return (
    <div className="basalte-edit">
      <Paper className="basalte-rail" p="md">
        <Stack gap="sm">
          <Select
            size="sm"
            label="Page"
            data={[
              ...payload.pages.map((entry) => ({
                value: entry.name,
                label: pageLabel(entry.name),
              })),
              ...asidesOf(payload).map((entry) => ({
                value: entry.entry,
                label: entry.title,
              })),
            ]}
            value={selected}
            allowDeselect={false}
            onChange={(value) => value !== null && onSelect(value)}
          />

          <Group justify="space-between" align="center" px={12}>
            <span className="basalte-eyebrow">
              {fixed ? 'Emplacements' : 'Sections'}
            </span>
            <Text size="sm" fw={700} c="dimmed">
              {draft.blocks.length}
            </Text>
          </Group>

          {fixed ? (
            // Ni poignée, ni œil barré : une entrée fixe ne se réordonne pas,
            // et elle ne se masque pas — une section se masque par langue,
            // jamais par support ni par page (D107).
            <Stack gap={2}>
              {draft.blocks.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className="basalte-section-row"
                  data-fixed="true"
                  aria-current={
                    active.kind === 'block' && active.id === section.id
                  }
                  onClick={() => setFocus({ kind: 'block', id: section.id })}
                >
                  <span className="basalte-section-row__label">
                    {labelOf(types, section.type)}
                  </span>
                </button>
              ))}
            </Stack>
          ) : (
            <SortableList
              ids={draft.blocks.map((section) => section.id)}
              onMove={(from, to) =>
                onDraft({ ...draft, blocks: move(draft.blocks, from, to) })
              }
            >
              <Stack gap={2}>
                {draft.blocks.map((section) => {
                  const hidden = section.hidden[editing.language] === true

                  return (
                    <SortableItem key={section.id} id={section.id}>
                      {(handle) => (
                        <button
                          type="button"
                          className="basalte-section-row"
                          aria-current={
                            active.kind === 'block' && active.id === section.id
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
                            {labelOf(types, section.type)}
                          </span>
                          {hidden && <HiddenMark />}
                        </button>
                      )}
                    </SortableItem>
                  )
                })}
              </Stack>
            </SortableList>
          )}

          {!fixed && draft.blocks.length === 0 && (
            <div className="basalte-empty">
              Cette page n’a pas encore de section, et le panel n’en ajoute pas.
            </div>
          )}

          <Text size="sm" c="dimmed" px={12}>
            {aside?.note ??
              'Une section masquée reste dans la liste : c’est le seul endroit d’où la rallumer.'}
          </Text>

          {!fixed && (
            <Text size="sm" c="dimmed" px={12}>
              Vous modifiez, réordonnez et masquez les sections. Ajouter une
              section ou une page{' '}
              {payload.support === '' ? (
                'ne se fait pas depuis le panel.'
              ) : (
                <>
                  se demande à{' '}
                  <Anchor href={`mailto:${payload.support}`}>
                    {payload.support}
                  </Anchor>
                  .
                </>
              )}
            </Text>
          )}

          {!fixed && (
            <Button
              variant={focus.kind === 'meta' ? 'light' : 'subtle'}
              color={focus.kind === 'meta' ? 'brand' : 'gray'}
              size="sm"
              mt="auto"
              onClick={() => setFocus({ kind: 'meta' })}
            >
              Informations de la page
            </Button>
          )}
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
            href={previewAddress(previewed, editing, viewport)}
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
          key={`${savedAt ?? 0}-${viewport}`}
          className="basalte-stage__frame"
          data-viewport={viewport}
          title="Aperçu de la page"
          src={previewAddress(previewed, editing, viewport)}
        />
      </div>

      <Paper className="basalte-inspector" p="md">
        <Stack gap="md">
          {active.kind === 'meta' ? (
            <>
              <div>
                <Text fz="var(--panel-text-title)" fw={700}>
                  Informations de la page
                </Text>
                <Text size="sm" c="dimmed">
                  {previewed}
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
              type={types.find((entry) => entry.name === focused.type)}
              hideable={!fixed}
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

/**
 * L’adresse de l’aperçu : la route de la page, préfixée si la langue n’est pas
 * celle par défaut, et le support demandé.
 */
function previewAddress(
  route: string,
  editing: {
    readonly language: string
    readonly languages: readonly {
      readonly code: string
      readonly default?: boolean
    }[]
  },
  support: string,
): string {
  const fallback = editing.languages.find((entry) => entry.default)?.code ?? ''
  const prefix = editing.language === fallback ? '' : editing.language
  const asked =
    support === DEFAULT_SUPPORT ? '' : `?${SUPPORT_PARAM}=${support}`

  return `${PREVIEW}${slugFor(route, prefix) ?? ''}${asked}`
}

function labelOf(
  types: readonly { readonly name: string; readonly label: string }[],
  type: string,
): string {
  return types.find((entry) => entry.name === type)?.label ?? type
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
