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
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'

import { asideOf, asidesOf } from './asides.js'
import type { ContentIssue } from '../content/report.js'
import { pageLabel } from '../content/naming.js'
import type { PanelPayload } from '../server/panel.js'
import { move, type Draft, type Values } from './draft.js'
import { editedLanguage, previewAddress, useEditing } from './editing.js'
import { FieldSet, type FieldIssue } from './fields/Field.js'
import { External } from './External.js'
import { Grip } from './Grip.js'
import { HiddenMark } from './HiddenMark.js'
import { Section } from './Section.js'
import { SortableItem, SortableList } from './Sortable.js'

type Focus =
  { readonly kind: 'meta' } | { readonly kind: 'block'; readonly id: string }

export function Edit({
  payload,
  selected,
  draft,
  savedAt,
  dirty,
  issues,
  wanted,
  onSelect,
  onDraft,
}: {
  readonly payload: PanelPayload
  readonly selected: string
  readonly draft: Draft
  readonly savedAt: number | undefined
  readonly dirty: boolean
  readonly issues: readonly ContentIssue[]
  /** L’incident qu’une ligne du résumé vient de désigner. */
  readonly wanted: ContentIssue | undefined
  readonly onSelect: (name: string) => void
  readonly onDraft: (draft: Draft) => void
}) {
  const editing = useEditing()
  const [focus, setFocus] = useState<Focus>({ kind: 'meta' })
  const [opened, setOpened] = useState<string>(selected)
  const [viewport, setViewport] = useState<string>('desktop')
  const [followed, setFollowed] = useState<ContentIssue | undefined>(undefined)

  // Une ligne du résumé ouvre la section qu’elle nomme : c’est le geste que le
  // client faisait à la main, en relisant la liste pour retrouver laquelle.
  if (followed !== wanted) {
    setFollowed(wanted)

    if (wanted !== undefined) {
      setFocus(
        wanted.section === undefined
          ? { kind: 'meta' }
          : { kind: 'block', id: wanted.section.id },
      )
    }
  }

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
  // Ce qui bloque, rangé par section : la liste le marque, et le panneau le
  // passe au champ.
  const wrong = new Set(
    issues
      .map((issue) => issue.section?.id)
      .filter((id): id is string => id !== undefined),
  )
  const metaIssues = issuesOf(issues, undefined)
  const spoken = editedLanguage(editing)

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

          {!fixed && (
            <div
              className="basalte-section-row"
              data-current={active.kind === 'meta'}
              data-wrong={metaIssues.length > 0}
            >
              <button
                type="button"
                className="basalte-section-row__label"
                aria-current={active.kind === 'meta'}
                onClick={() => setFocus({ kind: 'meta' })}
              >
                <span className="basalte-section-row__text">
                  Informations de la page
                </span>
              </button>
            </div>
          )}

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
              {draft.blocks.map((section) => {
                const current =
                  active.kind === 'block' && active.id === section.id

                return (
                  <div
                    key={section.id}
                    className="basalte-section-row"
                    data-fixed="true"
                    data-current={current}
                    data-wrong={wrong.has(section.id)}
                  >
                    <button
                      type="button"
                      className="basalte-section-row__label"
                      aria-current={current}
                      onClick={() =>
                        setFocus({ kind: 'block', id: section.id })
                      }
                    >
                      <span className="basalte-section-row__text">
                        {labelOf(types, section.type)}
                      </span>
                    </button>
                  </div>
                )
              })}
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
                  const current =
                    active.kind === 'block' && active.id === section.id

                  return (
                    <SortableItem key={section.id} id={section.id}>
                      {(handle) => (
                        <div
                          className="basalte-section-row"
                          data-current={current}
                          data-hidden={hidden}
                          data-wrong={wrong.has(section.id)}
                        >
                          <button
                            type="button"
                            className="basalte-handle"
                            ref={handle.ref}
                            aria-label={`Déplacer « ${labelOf(types, section.type)} »`}
                            {...handle.props}
                          >
                            <Grip />
                          </button>
                          <button
                            type="button"
                            className="basalte-section-row__label"
                            aria-current={current}
                            onClick={() =>
                              setFocus({ kind: 'block', id: section.id })
                            }
                          >
                            <span className="basalte-section-row__text">
                              {labelOf(types, section.type)}
                            </span>
                            {hidden && <HiddenMark />}
                          </button>
                        </div>
                      )}
                    </SortableItem>
                  )
                })}
              </Stack>
            </SortableList>
          )}

          {!fixed && draft.blocks.length === 0 && (
            <div className="basalte-empty">
              <strong>Aucune section</strong>
              <span>
                Cette page est vide, et le panel n’ajoute pas de section.
              </span>
            </div>
          )}
        </Stack>
      </Paper>

      <div className="basalte-stage">
        <div className="basalte-stage__head">
          <Title order={2}>Aperçu</Title>
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
            <External />
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
        <Stack gap="sm">
          {spoken !== undefined && (
            <Text size="xs" c="dimmed">
              {spoken}
            </Text>
          )}

          {active.kind === 'meta' ? (
            <>
              <div>
                <Title order={2}>Informations de la page</Title>
                <Text size="sm" c="dimmed">
                  {previewed}
                </Text>
              </div>
              <FieldSet
                descriptions={payload.meta}
                values={draft.meta as Values}
                issues={metaIssues}
                onChange={(meta) => onDraft({ ...draft, meta })}
              />
            </>
          ) : focused === undefined ? (
            <div className="basalte-empty">
              <strong>Section introuvable</strong>
              <span>Elle n’est plus dans la page.</span>
            </div>
          ) : (
            <Section
              section={focused}
              type={types.find((entry) => entry.name === focused.type)}
              hideable={!fixed}
              issues={issuesOf(issues, focused.id)}
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
 * Les incidents d’une section, leur chemin nu : le serveur le donne relatif aux
 * champs de la section, et c’est exactement ce qu’un `FieldSet` attend.
 */
export function issuesOf(
  issues: readonly ContentIssue[],
  section: string | undefined,
): readonly FieldIssue[] {
  return issues
    .filter((issue) => issue.section?.id === section)
    .map((issue) => ({
      path: issue.path ?? [],
      ...(issue.language === undefined ? {} : { language: issue.language }),
      message: issue.message,
    }))
}

function labelOf(
  types: readonly { readonly name: string; readonly label: string }[],
  type: string,
): string {
  return types.find((entry) => entry.name === type)?.label ?? type
}
