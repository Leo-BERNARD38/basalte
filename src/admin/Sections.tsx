// La liste des sections d’une page : ce qu’elle porte, dans quel ordre, et ce
// qui ne paraît pas.
//
// On ne s’en sert plus pour choisir — l’aperçu le fait mieux, en montrant ce
// qu’on désigne. Ce qu’elle garde est ce que l’aperçu ne peut pas dire : l’ordre
// des sections, celles qui sont masquées et n’y paraissent donc pas, et celles
// qu’un contrôle a refusées.
//
// Une entrée fixe — l’en-tête et le pied, la fiche de l’entreprise — porte des
// emplacements, pas des sections : ni poignée, ni masquage, ni ajout.

import type { PanelBlockType } from '../server/panel.js'
import { move, sectionSummary, type Draft, type Values } from './draft.js'
import { useEditing } from './editing.js'
import { SortableItem, SortableList } from './Sortable.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Grip, HiddenMark, Plus } from './ui/icons.js'
import { Stack } from './ui/Layout.js'
import { Row, RowGlyph, RowStack, RowText } from './ui/Row.js'
import { Empty } from './ui/Surface.js'
import { Text } from './ui/Text.js'

export function Sections({
  draft,
  types,
  fixed,
  wrong,
  current,
  onFocus,
  onDraft,
  onAdd,
}: {
  readonly draft: Draft
  readonly types: readonly PanelBlockType[]
  readonly fixed: boolean
  /** Les sections qu’un contrôle a refusées. */
  readonly wrong: ReadonlySet<string>
  /** La section choisie, s’il y en a une. */
  readonly current: string
  readonly onFocus: (id: string) => void
  readonly onDraft: (draft: Draft) => void
  /** Demander une section de plus, avant celle-ci — vide : à la fin. */
  readonly onAdd: (before: string) => void
}) {
  const editing = useEditing()

  if (fixed) {
    return (
      <Stack gap="hair">
        {draft.blocks.map((section) => (
          <Row
            key={section.id}
            current={section.id === current}
            wrong={wrong.has(section.id)}
            onClick={() => onFocus(section.id)}
          >
            <RowGlyph />
            <RowText>{labelOf(types, section.type)}</RowText>
          </Row>
        ))}
      </Stack>
    )
  }

  if (draft.blocks.length === 0) {
    return (
      <Stack gap="md">
        <Empty
          title="Aucune section"
          note="Cette page est vide. Ajoutez-en une pour commencer."
        />
        <Button
          variant="filled"
          icon={<Plus />}
          onClick={() => onAdd('')}
          block
        >
          Ajouter une section
        </Button>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Stack gap="hair">
        <SortableList
          ids={draft.blocks.map((section) => section.id)}
          onMove={(from, to) =>
            onDraft({ ...draft, blocks: move(draft.blocks, from, to) })
          }
        >
          {draft.blocks.map((section) => {
            const hidden = section.hidden[editing.language] === true
            const kind = labelOf(types, section.type)
            const summary = sectionSummary(
              types.find((entry) => entry.name === section.type)?.fields ?? [],
              section.props as Values,
              editing.language,
            )

            return (
              <SortableItem key={section.id} id={section.id}>
                {(handle) => (
                  <Row
                    current={section.id === current}
                    hidden={hidden}
                    wrong={wrong.has(section.id)}
                    handle={
                      <button
                        type="button"
                        className="basalte-handle"
                        ref={handle.ref}
                        aria-label={`Déplacer « ${kind} »`}
                        {...handle.props}
                      >
                        <Grip />
                      </button>
                    }
                    onClick={() => onFocus(section.id)}
                  >
                    {/* Le texte de la section d’abord, sa sorte en note :
                        c’est le texte qu’on cherche dans une liste, et
                        quatorze « Grille de cartes » ne disaient pas
                        laquelle. */}
                    {summary === '' || summary === kind ? (
                      <RowText>{kind}</RowText>
                    ) : (
                      <RowStack>
                        <span>{summary}</span>
                        <Text tone="meta" role="label-md">
                          {kind}
                        </Text>
                      </RowStack>
                    )}
                    {hidden && (
                      <Mark hatched>
                        <HiddenMark size={12} />
                        masquée
                      </Mark>
                    )}
                  </Row>
                )}
              </SortableItem>
            )
          })}
        </SortableList>
      </Stack>

      <Button variant="text" icon={<Plus />} onClick={() => onAdd('')}>
        Ajouter une section
      </Button>
    </Stack>
  )
}

function labelOf(
  types: readonly { readonly name: string; readonly label: string }[],
  type: string,
): string {
  return types.find((entry) => entry.name === type)?.label ?? type
}
