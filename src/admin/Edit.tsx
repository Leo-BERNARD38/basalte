// L’écran d’édition, en trois colonnes : ce qu’on modifie, le formulaire de
// ce qui est choisi, et l’aperçu. C’est l’écran par défaut, celui que le
// client ouvre chaque semaine.
//
// La première colonne est la structure : la page ouverte et la langue écrite,
// puis les sections de la page. C’est le plan de ce qu’on modifie, et c’est
// pourquoi le choix de la page vit ici et non dans la barre de l’aperçu — une
// puce d’adresse au bout d’une barre d’outils ne se lisait pas comme le menu
// des pages, et disparaissait sous le formulaire dès que l’écran s’empilait.
// La deuxième colonne est le formulaire, et il commence en haut : il n’a plus
// à attendre que la liste des sections et les avertissements du site soient
// passés. La troisième est l’aperçu (D96), réduit à l’échelle de sa colonne.
//
// Ce que le site a à corriger avant sa mise en ligne se tient en tête du
// formulaire, parce que c’est là qu’on y remédie ; ce qui ne fait que demander
// un regard se range au pied de la structure, replié, parce qu’il ne concerne
// pas la page ouverte plus qu’une autre.
//
// Une section se masque par langue, jamais par support (D107) : la liste ne
// porte donc qu’une marque de masquage, et le support ne s’y règle pas.

import { useState } from 'react'

import type { ContentIssue } from '../content/report.js'
import type { PanelBlockType, PanelPayload } from '../server/panel.js'
import { asideOf, asidesOf } from './asides.js'
import {
  emptyValues,
  move,
  sectionSummary,
  type Draft,
  type Values,
} from './draft.js'
import { editedLanguage, previewAddress, useEditing } from './editing.js'
import { FieldSet, type FieldIssue } from './fields/Field.js'
import { Language } from './Language.js'
import { orderedPages, pageTitle } from './pages.js'
import { Section } from './Section.js'
import { SortableItem, SortableList } from './Sortable.js'
import { Stage } from './Stage.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Description, Grip, HiddenMark, Plus } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Anchor, Menu, Selector } from './ui/Overlay.js'
import { Row, RowGlyph, RowStack, RowText } from './ui/Row.js'
import { Banner, Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, plural, Text, Title } from './ui/Text.js'

type Focus =
  { readonly kind: 'meta' } | { readonly kind: 'block'; readonly id: string }

type Problems = PanelPayload['problems']

/**
 * Les points, rangés sous la page qu’ils visent. Une médiathèque qui porte
 * douze images inemployées écrivait douze phrases identiques à un mot près :
 * groupées, elles font un titre, un compte, et douze lignes qu’on parcourt au
 * lieu de les lire. L’ordre d’arrivée est gardé — c’est celui du contrôle.
 */
export function groupProblems(problems: Problems): readonly {
  readonly page: string
  readonly points: Problems
}[] {
  const pages: string[] = []
  const under = new Map<string, Problems[number][]>()

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
  const [followed, setFollowed] = useState<ContentIssue | undefined>(undefined)
  const [pages, setPages] = useState(false)
  const [adding, setAdding] = useState(false)
  const [allProblems, setAllProblems] = useState(false)

  const site = payload.site.name
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

  // Le formulaire suit la page ouverte : sans cette remise à zéro, passer
  // d’une page au chrome laisserait un identifiant que la nouvelle liste ne
  // porte pas, et le formulaire dirait que la section a disparu.
  if (opened !== selected) {
    setOpened(selected)
    setFocus(
      aside === undefined
        ? { kind: 'meta' }
        : { kind: 'block', id: aside.sections[0]?.id ?? '' },
    )
  }

  // Ce qui bloque, rangé par section : la liste le marque, et le formulaire
  // le passe au champ.
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

  const title =
    aside?.title ?? (page === undefined ? '' : pageTitle(page, site))

  // Le chrome se règle en regardant l’accueil : c’est là qu’il se voit en
  // entier, et le client n’a pas à savoir qu’il est sur toutes les pages.
  const previewed = page?.route ?? '/'

  // La bibliothèque des sections d’une page, ou les emplacements d’une entrée
  // fixe : dans les deux cas, un descripteur par type.
  const types = aside?.types ?? payload.library

  // Une entrée fixe n’a pas de métadonnées : son formulaire ouvre sur le
  // premier emplacement plutôt que sur un formulaire qui n’existe pas.
  const active: Focus =
    fixed && focus.kind === 'meta'
      ? { kind: 'block', id: draft.blocks[0]?.id ?? '' }
      : focus

  const focused =
    active.kind === 'block'
      ? draft.blocks.find((entry) => entry.id === active.id)
      : undefined

  // Le nom que porte un point : le titre de la page, celui d’une entrée fixe,
  // ou ce que le serveur a écrit — « médiathèque ».
  const nameOf = (entry: string): string => {
    const named = payload.pages.find((item) => item.name === entry)

    if (named !== undefined) return pageTitle(named, site)

    return asideOf(payload, entry)?.title ?? entry
  }

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

  const problems = payload.problems.length > 0 && (
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
                  <Eyebrow>{nameOf(group.page)}</Eyebrow>
                  <Spacer />
                  {/* Un compte de un ne dit rien que la ligne en dessous ne
                      dise déjà. */}
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
  )

  return (
    <div className="basalte-edit">
      <div className="basalte-structure">
        <Card pad="sm">
          <Stack gap="xs">
            <Anchor fill>
              <Selector
                label="Page"
                value={title}
                opened={pages}
                onToggle={() => setPages(!pages)}
              />

              <Menu
                opened={pages}
                align="left"
                label="Vos pages"
                onClose={() => setPages(false)}
              >
                <Eyebrow className="basalte-menu__note">
                  vos pages · cliquez pour la modifier
                </Eyebrow>

                {orderedPages(payload.pages).map((entry) => (
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
                      <span>{pageTitle(entry, site)}</span>
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

            <Language />

            {/* Ce qui appartient à la page et non à une section — son titre
                et sa description — se tient avec la page, pas dans la liste
                des sections, où la ligne passait pour une section de plus. */}
            {!fixed && (
              <Row
                current={active.kind === 'meta'}
                wrong={metaIssues.length > 0}
                onClick={() => setFocus({ kind: 'meta' })}
              >
                <RowGlyph>
                  <Description size={18} />
                </RowGlyph>
                <RowText>Titre et description</RowText>
              </Row>
            )}
          </Stack>
        </Card>

        <Card pad="sm">
          <Stack gap="md">
            <Group gap="md" align="baseline" className="basalte-aside__head">
              <Title role="title-md">
                {fixed ? 'Emplacements' : 'Sections'}
              </Title>
              <Spacer />
              <Text tone="meta" role="label-md">
                {draft.blocks.length} {plural(draft.blocks.length, 'section')}
              </Text>
            </Group>

            <Stack gap="hair">
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
                    const kind = labelOf(types, section.type)
                    const summary = sectionSummary(
                      types.find((entry) => entry.name === section.type)
                        ?.fields ?? [],
                      section.props as Values,
                      editing.language,
                    )

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
                            {/* Le texte de la section d’abord, sa sorte en
                                note : c’est le texte qu’on cherche dans une
                                liste, et quatorze « Grille de cartes » ne
                                disaient pas laquelle. */}
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

        {!blocking && problems}
      </div>

      <div className="basalte-form">
        {blocking && problems}

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
                  <Title role="title-md">Titre et description</Title>
                  <Text tone="muted">
                    Ce que les moteurs de recherche et les réseaux montrent de
                    cette page.
                  </Text>
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

      <Stage
        address={(support) => previewAddress(previewed, editing, support)}
        anchor={active.kind === 'block' ? active.id : undefined}
        stale={dirty}
        frameKey={String(savedAt ?? 0)}
        title="Aperçu de la page"
      />
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
