// L’écran d’édition : l’aperçu à gauche, la page et ses réglages à droite.
// C’est l’écran par défaut, celui que le client ouvre chaque semaine.
//
// L’aperçu n’est pas une carte : un trait d’encre le pose comme un document,
// et c’est le seul filet noir du panel. Il montre le dernier enregistrement —
// c’est ce que le dépôt contient, et donc ce qui partira en ligne.
//
// Ce qui commande l’aperçu flotte au-dessus de lui, dans une barre posée sur le
// canvas : le support regardé, la page ouverte, et son adresse. Chaque élément
// est là où on le cherche — le sélecteur de page à côté du lien qui l’ouvre,
// et non dans l’en-tête, qui dit l’écran et non la page.
//
// La bascule bureau / mobile ne fait pas que redimensionner le cadre : elle
// demande le rendu du support à l’aperçu, qui les sert tous les deux (D25).
//
// Une section se masque par langue, jamais par support (D107) : la liste ne
// porte donc qu’une marque de masquage, et le support ne s’y règle pas.

import { useState } from 'react'

import { pageLabel } from '../content/naming.js'
import type { ContentIssue } from '../content/report.js'
import type { PanelBlockType, PanelPayload } from '../server/panel.js'
import { asideOf, asidesOf } from './asides.js'
import { emptyValues, move, type Draft, type Values } from './draft.js'
import { editedLanguage, previewAddress, useEditing } from './editing.js'
import { FieldSet, type FieldIssue } from './fields/Field.js'
import { Language } from './Language.js'
import { Section } from './Section.js'
import { SortableItem, SortableList } from './Sortable.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import {
  Desktop,
  External,
  Grip,
  HiddenMark,
  Mobile,
  Plus,
} from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Anchor, Menu } from './ui/Overlay.js'
import { Row, RowGlyph, RowStack, RowText } from './ui/Row.js'
import { Banner, Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, plural, Text, Title } from './ui/Text.js'
import { Segmented } from './ui/Toggle.js'

type Focus =
  { readonly kind: 'meta' } | { readonly kind: 'block'; readonly id: string }

type Viewport = 'desktop' | 'mobile'

const SUPPORTS = [
  {
    value: 'desktop' as const,
    label: (
      <>
        <Desktop />
        Bureau
      </>
    ),
  },
  {
    value: 'mobile' as const,
    label: (
      <>
        <Mobile />
        Mobile
      </>
    ),
  },
]

/**
 * Les points, rangés sous la page qu’ils visent. Une médiathèque qui porte
 * douze images inemployées écrivait douze phrases identiques à un mot près :
 * groupées, elles font un titre, un compte, et douze lignes qu’on parcourt au
 * lieu de les lire. L’ordre d’arrivée est gardé — c’est celui du contrôle.
 */
export function groupProblems(problems: PanelPayload['problems']): readonly {
  readonly page: string
  readonly points: PanelPayload['problems']
}[] {
  const pages: string[] = []
  const under = new Map<string, PanelPayload['problems'][number][]>()

  for (const problem of problems) {
    const found = under.get(problem.page)

    if (found === undefined) {
      pages.push(problem.page)
      under.set(problem.page, [problem])
    } else found.push(problem)
  }

  return pages.map((page) => ({ page, points: under.get(page) ?? [] }))
}

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
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [followed, setFollowed] = useState<ContentIssue | undefined>(undefined)
  const [pages, setPages] = useState(false)
  const [adding, setAdding] = useState(false)
  const [allProblems, setAllProblems] = useState(false)

  const blocking = payload.problems.some(
    (problem) => problem.severity === 'error',
  )

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

  // Le panneau suit la page ouverte : sans cette remise à zéro, passer d’une
  // page au chrome laisserait un identifiant que la nouvelle liste ne porte
  // pas, et le panneau dirait que la section a disparu.
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
    return <Text tone="muted">Ce site n’a aucune page.</Text>
  }

  // Le chrome se règle en regardant l’accueil : c’est là qu’il se voit en
  // entier, et le client n’a pas à savoir qu’il est sur toutes les pages.
  const previewed = page?.route ?? '/'
  const address = previewAddress(previewed, editing, viewport)

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

  function addSection(type: PanelBlockType): void {
    const languages = payload.site.languages.map((entry) => entry.code)
    const born = {
      id: crypto.randomUUID(),
      type: type.name,
      hidden: {},
      props: emptyValues(type.fields, languages),
    }

    setAdding(false)
    setFocus({ kind: 'block', id: born.id })
    onDraft({ ...draft, blocks: [...draft.blocks, born] })
  }

  return (
    <div className="basalte-edit">
      <div className="basalte-stage">
        <div className="basalte-stage__screen" data-viewport={viewport}>
          <div className="basalte-stage__bar">
            <Segmented
              label="Le support regardé"
              value={viewport}
              items={SUPPORTS}
              onChange={setViewport}
            />

            <Spacer />

            <Group gap="md">
              <Language />

              <Anchor>
                <button
                  type="button"
                  className="basalte-picker"
                  aria-expanded={pages}
                  onClick={() => setPages(!pages)}
                >
                  <Mono>{fixed ? (aside?.title ?? '') : previewed}</Mono>
                </button>

                <Menu
                  opened={pages}
                  label="Vos pages"
                  onClose={() => setPages(false)}
                >
                  <Eyebrow className="basalte-menu__note">
                    vos pages · cliquez pour la modifier
                  </Eyebrow>

                  {payload.pages.map((entry) => (
                    <Row
                      key={entry.name}
                      pill
                      current={entry.name === selected}
                      onClick={() => {
                        onSelect(entry.name)
                        setPages(false)
                      }}
                    >
                      <RowStack>
                        <span>{pageLabel(entry.name)}</span>
                        <Mono className="basalte-row__note">{entry.route}</Mono>
                      </RowStack>
                      <Mono className="basalte-row__note">
                        {entry.blocks.length}{' '}
                        {plural(entry.blocks.length, 'section')}
                      </Mono>
                    </Row>
                  ))}

                  <span className="basalte-menu__rule" />

                  {asidesOf(payload).map((entry) => (
                    <Row
                      key={entry.entry}
                      pill
                      current={entry.entry === selected}
                      onClick={() => {
                        onSelect(entry.entry)
                        setPages(false)
                      }}
                    >
                      <RowText>{entry.title}</RowText>
                    </Row>
                  ))}
                </Menu>
              </Anchor>

              <a
                className="basalte-preview-link"
                href={address}
                target="_blank"
                rel="noopener"
                aria-label="Ouvrir la page dans un onglet"
              >
                <External />
              </a>
            </Group>
          </div>

          {dirty && (
            <Text className="basalte-stage__note" tone="meta" role="label-md">
              L’aperçu montre le dernier enregistrement. Enregistrez pour le
              voir se mettre à jour.
            </Text>
          )}

          <iframe
            key={`${savedAt ?? 0}-${viewport}`}
            className="basalte-stage__frame"
            title="Aperçu de la page"
            src={address}
          />
        </div>
      </div>

      <div className="basalte-aside">
        {/* Ce qu’il reste à corriger est ici et pas dans le tronc commun : ces
            points naissent du contenu, et c’est dans cette colonne qu’on les
            corrige. Sur les autres écrans, ils n’étaient qu’un bandeau de plus
            à sauter. L’ambre appelle le regard, le rouge empêche la mise en
            ligne — et la couleur se lit sans qu’on lise la phrase. */}
        {payload.problems.length > 0 && (
          <Banner tone={blocking ? 'refused' : 'watch'}>
            <Stack gap="sm">
              <Group gap="md">
                <strong>
                  {blocking
                    ? 'À corriger avant la mise en ligne'
                    : `${payload.problems.length} ${plural(payload.problems.length, 'point')} à regarder`}
                </strong>
                {!blocking && (
                  <>
                    <Spacer />
                    <button
                      type="button"
                      className="basalte-link"
                      onClick={() => setAllProblems(!allProblems)}
                    >
                      {allProblems ? 'replier' : 'voir'}
                    </button>
                  </>
                )}
              </Group>
              {(blocking || allProblems) && (
                <Stack gap="md">
                  {groupProblems(payload.problems).map((group) => (
                    <Stack key={group.page} gap="xs" className="basalte-points">
                      <Group gap="md" align="baseline">
                        <Eyebrow>{group.page}</Eyebrow>
                        <Spacer />
                        {/* Un compte de un ne dit rien que la ligne en
                            dessous ne dise déjà. */}
                        {group.points.length > 1 && (
                          <Eyebrow>{group.points.length}</Eyebrow>
                        )}
                      </Group>
                      {group.points.map((point, rank) => (
                        <Text
                          key={`${rank}-${point.message}`}
                          tone="muted"
                          role="label-md"
                        >
                          {point.place === '' ? '' : `${point.place} — `}
                          {point.message}
                        </Text>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Banner>
        )}

        <Card pad="sm">
          <Stack gap="md">
            <Group gap="md" align="baseline" className="basalte-aside__head">
              <Title role="title-md">
                {fixed ? 'Emplacements' : 'Sections de cette page'}
              </Title>
              <Spacer />
              <Mono className="basalte-row__note">
                {draft.blocks.length} {plural(draft.blocks.length, 'section')}
              </Mono>
            </Group>

            <Stack gap="hair">
              {!fixed && (
                <Row
                  current={active.kind === 'meta'}
                  wrong={metaIssues.length > 0}
                  onClick={() => setFocus({ kind: 'meta' })}
                >
                  <RowGlyph />
                  <RowText>Informations de la page</RowText>
                </Row>
              )}

              {fixed ? (
                // Ni poignée, ni œil barré : une entrée fixe ne se réordonne
                // pas, et elle ne se masque pas.
                draft.blocks.map((section) => (
                  <Row
                    key={section.id}
                    current={
                      active.kind === 'block' && active.id === section.id
                    }
                    wrong={wrong.has(section.id)}
                    onClick={() => setFocus({ kind: 'block', id: section.id })}
                  >
                    <RowGlyph />
                    <RowText>{labelOf(types, section.type)}</RowText>
                  </Row>
                ))
              ) : (
                <SortableList
                  ids={draft.blocks.map((section) => section.id)}
                  onMove={(from, to) =>
                    onDraft({ ...draft, blocks: move(draft.blocks, from, to) })
                  }
                >
                  {draft.blocks.map((section) => {
                    const hidden = section.hidden[editing.language] === true
                    const current =
                      active.kind === 'block' && active.id === section.id

                    return (
                      <SortableItem key={section.id} id={section.id}>
                        {(handle) => (
                          <Row
                            current={current}
                            hidden={hidden}
                            wrong={wrong.has(section.id)}
                            handle={
                              <button
                                type="button"
                                className="basalte-handle"
                                ref={handle.ref}
                                aria-label={`Déplacer « ${labelOf(types, section.type)} »`}
                                {...handle.props}
                              >
                                <Grip />
                              </button>
                            }
                            onClick={() =>
                              setFocus({ kind: 'block', id: section.id })
                            }
                          >
                            <RowText>{labelOf(types, section.type)}</RowText>
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
              )}
            </Stack>

            {!fixed && draft.blocks.length === 0 && (
              <Empty
                title="Aucune section"
                note="Cette page est vide. Ajoutez-en une pour commencer."
              />
            )}

            {!fixed && (
              <Anchor>
                <Button
                  variant="text"
                  icon={<Plus />}
                  aria-expanded={adding}
                  onClick={() => setAdding(!adding)}
                >
                  Ajouter une section
                </Button>

                <Menu
                  opened={adding}
                  align="left"
                  label="Les sections que vous pouvez ajouter"
                  onClose={() => setAdding(false)}
                >
                  <Eyebrow className="basalte-menu__note">
                    ce que vous pouvez poser sur cette page
                  </Eyebrow>
                  {types.map((type) => (
                    <Row key={type.name} pill onClick={() => addSection(type)}>
                      <RowStack>
                        <span>{type.label}</span>
                        {type.help !== undefined && (
                          <Text tone="meta" role="label-md">
                            {type.help}
                          </Text>
                        )}
                      </RowStack>
                    </Row>
                  ))}
                </Menu>
              </Anchor>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap="xl">
            {active.kind === 'meta' ? (
              <Stack gap="xl">
                <Stack gap="xs">
                  <Eyebrow>
                    {[previewed, spoken]
                      .filter((part) => part !== undefined)
                      .join(' · ')}
                  </Eyebrow>
                  <Title role="title-md">Informations de la page</Title>
                </Stack>
                <FieldSet
                  descriptions={payload.meta}
                  values={draft.meta as Values}
                  issues={metaIssues}
                  onChange={(meta) => onDraft({ ...draft, meta })}
                />
              </Stack>
            ) : focused === undefined ? (
              <Empty
                title="Section introuvable"
                note="Elle n’est plus dans la page."
              />
            ) : (
              <Section
                section={focused}
                context={spoken}
                type={types.find((entry) => entry.name === focused.type)}
                hideable={!fixed}
                issues={issuesOf(issues, focused.id)}
                onRemove={
                  fixed
                    ? undefined
                    : () =>
                        onDraft({
                          ...draft,
                          blocks: draft.blocks.filter(
                            (entry) => entry.id !== focused.id,
                          ),
                        })
                }
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
        </Card>
      </div>
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
