// L’écran d’édition, en deux colonnes : l’aperçu, et le volet de ce qu’on
// modifie. C’est l’écran par défaut, celui que le client ouvre chaque semaine.
//
// L’aperçu est la surface de travail : on y désigne une section en cliquant
// dessus, et on y demande une section de plus entre deux autres. Le choix de la
// page se fait dans sa barre, comme l’adresse dans une chrome de navigateur.
// Une troisième colonne portait la page, la langue et la liste des sections ;
// la sélection s’y faisait, et c’était sa raison d’être — elle se fait
// maintenant là où l’on voit ce qu’on désigne.
//
// Le volet ne montre qu’une chose à la fois : la liste des sections, ce qui
// appartient à la page, ou le formulaire de la section choisie. Empilées, les
// trois faisaient une colonne qu’on ne lisait plus.
//
// Ce que le site a à corriger se tient en tête du volet, dans les trois vues :
// c’est là qu’on y remédie, et une même annonce à deux endroits se disait deux
// fois.
//
// Une section se masque par langue, jamais par support (D107) : la liste ne
// porte donc qu’une marque de masquage, et le support ne s’y règle pas.

import { useState } from 'react'

import type { ContentIssue } from '../content/report.js'
import type { PanelBlockType, PanelPayload } from '../server/panel.js'
import { asideOf } from './asides.js'
import { emptyValues, type Draft, type Values } from './draft.js'
import { previewAddress, useEditing } from './editing.js'
import { FieldSet, issuesOf } from './fields/Field.js'
import { Inspector } from './Inspector.js'
import { Language } from './Language.js'
import { pageTitle } from './pages.js'
import { PageMenu } from './PageMenu.js'
import { Problems } from './Problems.js'
import { Section } from './Section.js'
import { Sections } from './Sections.js'
import { Stage } from './Stage.js'
import { Button } from './ui/Button.js'
import { ArrowBack, Description } from './ui/icons.js'
import { Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Empty } from './ui/Surface.js'
import { Text, Title } from './ui/Text.js'
import { Segmented } from './ui/Toggle.js'

/**
 * Ce que le volet montre : la liste des sections, ce qui appartient à la page,
 * ou le formulaire de la section choisie. Une chose à la fois — les trois
 * empilées dans une colonne étaient précisément ce qu’on ne lisait plus.
 */
type Focus =
  | {
      readonly kind: 'browse'
      readonly tab: 'sections' | 'page'
      /** La section qu’on vient de quitter : la liste la garde en évidence. */
      readonly from?: string
    }
  | { readonly kind: 'block'; readonly id: string }

/** Le volet au repos : les sections, parce que c’est ce qu’on modifie. */
const BROWSE: Focus = { kind: 'browse', tab: 'sections' }

const TABS = [
  { value: 'sections' as const, label: 'Sections' },
  { value: 'page' as const, label: 'Page' },
]

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
  const [focus, setFocus] = useState<Focus>(BROWSE)
  /** La page à laquelle le choix courant appartient. */
  const [openedPage, setOpenedPage] = useState<string>(selected)
  /** Vrai quand le volet est déployé : sous 1 200 px, il couvre l’aperçu. */
  const [opened, setOpened] = useState(false)
  const [followed, setFollowed] = useState<ContentIssue | undefined>(undefined)
  const [pages, setPages] = useState(false)
  /**
   * Où une section est demandée : l’identifiant de celle qui la suivra, ou la
   * chaîne vide pour la fin de la page. `undefined` : rien n’est demandé.
   */
  const [inserting, setInserting] = useState<string | undefined>(undefined)

  const site = payload.site.name

  // Une ligne du résumé ouvre la section qu’elle nomme : c’est le geste que le
  // client faisait à la main, en relisant la liste pour retrouver laquelle.
  if (followed !== wanted) {
    setFollowed(wanted)

    if (wanted !== undefined) {
      setFocus(
        wanted.section === undefined
          ? { kind: 'browse', tab: 'page' }
          : { kind: 'block', id: wanted.section.id },
      )
      setOpened(true)
    }
  }

  // Le chrome et la fiche d’entreprise s’ouvrent ici comme des pages : ils
  // portent des sections, sans route ni métadonnées.
  const aside = asideOf(payload, selected)
  const fixed = aside !== undefined

  // Le volet suit la page ouverte : sans cette remise à zéro, passer d’une page
  // au chrome laisserait un identifiant que la nouvelle liste ne porte pas, et
  // le volet dirait que la section a disparu.
  if (openedPage !== selected) {
    setOpenedPage(selected)
    setFocus(BROWSE)
  }

  // Ce qui bloque, rangé par section : la liste le marque, et le formulaire
  // le passe au champ.
  const wrong = new Set(
    issues
      .map((issue) => issue.section?.id)
      .filter((id): id is string => id !== undefined),
  )
  const metaIssues = issuesOf(issues, undefined)
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

  // Une entrée fixe n’a ni métadonnées ni ordre : son volet n’a que la liste
  // de ses emplacements, jamais l’onglet « Page ».
  const active: Focus =
    fixed && focus.kind === 'browse'
      ? { ...focus, tab: 'sections' as const }
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

  /**
   * Le rang où la section se pose, tiré de celle qui la suivra : l’aperçu
   * montre le dernier enregistrement, et le brouillon a pu être réordonné
   * depuis. Une voisine qu’il ne porte plus renvoie à la fin.
   */
  const rankOf = (before: string | undefined): number => {
    const found = draft.blocks.findIndex((section) => section.id === before)

    return found === -1 ? draft.blocks.length : found
  }

  function addSection(type: PanelBlockType): void {
    const languages = payload.site.languages.map((entry) => entry.code)
    const born = {
      id: crypto.randomUUID(),
      type: type.name,
      hidden: {},
      props: emptyValues(type.fields, languages),
    }
    const blocks = [...draft.blocks]

    blocks.splice(rankOf(inserting), 0, born)

    setInserting(undefined)
    setFocus({ kind: 'block', id: born.id })
    onDraft({ ...draft, blocks })
  }

  // Une section désignée dans l’aperçu. Le cadre montre le dernier
  // enregistrement : il peut nommer une section que le brouillon vient de
  // perdre, et c’est le brouillon qui fait foi.
  function pickInPreview(id: string): void {
    if (!draft.blocks.some((section) => section.id === id)) return

    setFocus({ kind: 'block', id })
    setOpened(true)
  }

  /** La section devant laquelle la nouvelle se posera, quand il y en a une. */
  const neighbour = types.find(
    (type) =>
      type.name ===
      draft.blocks.find((section) => section.id === inserting)?.type,
  )?.label

  return (
    <div className="basalte-edit">
      <Stage
        address={(support) => previewAddress(previewed, editing, support)}
        selection={active.kind === 'block' ? active.id : ''}
        onPick={fixed ? undefined : pickInPreview}
        onInsert={fixed ? undefined : setInserting}
        bar={
          <PageMenu
            payload={payload}
            selected={selected}
            title={title}
            opened={pages}
            onOpened={setPages}
            onSelect={onSelect}
          />
        }
        stale={dirty}
        frameKey={`${savedAt ?? 0}-${previewed}-${editing.language}`}
        title="Aperçu de la page"
      />

      {/* Sous 1 200 pixels, le volet vient par-dessus l’aperçu : ce bouton est
          alors le seul chemin vers la liste, puisqu’on n’a rien désigné. */}
      <Button
        className="basalte-inspector__open"
        variant="tonal"
        icon={<Description size={18} />}
        onClick={() => setOpened(true)}
      >
        {fixed ? 'Emplacements' : 'Sections'}
      </Button>

      <Inspector
        opened={opened}
        onClose={() => setOpened(false)}
        head={
          <>
            {active.kind === 'block' ? (
              <Button
                variant="text"
                size="sm"
                icon={<ArrowBack size={18} />}
                onClick={() =>
                  setFocus({ kind: 'browse', tab: 'sections', from: active.id })
                }
              >
                {fixed ? 'Emplacements' : 'Sections'}
              </Button>
            ) : fixed ? (
              <Title role="title-md">Emplacements</Title>
            ) : (
              <Segmented
                label="Ce que vous modifiez"
                value={active.tab}
                items={TABS}
                onChange={(tab) => setFocus({ kind: 'browse', tab })}
              />
            )}
            <Spacer />
            <Language form="bar" />
          </>
        }
      >
        <Stack gap="xl">
          <Problems points={payload.problems} nameOf={nameOf} />

          {active.kind === 'browse' && active.tab === 'sections' && (
            <Sections
              draft={draft}
              types={types}
              fixed={fixed}
              wrong={wrong}
              current={active.from ?? ''}
              onFocus={(id) => setFocus({ kind: 'block', id })}
              onDraft={onDraft}
              onAdd={setInserting}
            />
          )}

          {active.kind === 'browse' && active.tab === 'page' && (
            <Stack gap="xl">
              <FieldSet
                descriptions={payload.meta}
                values={draft.meta as Values}
                issues={metaIssues}
                onChange={(meta) => onDraft({ ...draft, meta })}
              />
            </Stack>
          )}

          {active.kind === 'block' &&
            (focused === undefined ? (
              <Empty
                title="Section introuvable"
                note="Elle n’est plus dans la page."
              />
            ) : (
              <Section
                section={focused}
                type={types.find((entry) => entry.name === focused.type)}
                hideable={!fixed}
                issues={issuesOf(issues, focused.id)}
                onRemove={
                  fixed
                    ? undefined
                    : () => {
                        setFocus(BROWSE)
                        onDraft({
                          ...draft,
                          blocks: draft.blocks.filter(
                            (entry) => entry.id !== focused.id,
                          ),
                        })
                      }
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
            ))}
        </Stack>
      </Inspector>

      {/* Le choix d’une section est le seul moment où le client a besoin qu’on
          lui dise ce qu’une section fait : c’est ici, et nulle part ailleurs,
          que la phrase d’un bloc se lit. */}
      <Modal
        opened={inserting !== undefined}
        title="Ajouter une section"
        note={
          <Text tone="meta" role="label-md">
            {neighbour === undefined
              ? 'Elle se posera à la fin de la page.'
              : `Elle se posera avant « ${neighbour} ».`}
          </Text>
        }
        width="var(--panel-width-modal)"
        onClose={() => setInserting(undefined)}
      >
        <div className="basalte-catalogue">
          {types.map((type) => (
            <button
              key={type.name}
              type="button"
              className="basalte-choice"
              onClick={() => addSection(type)}
            >
              <strong>{type.label}</strong>
              {type.help !== undefined && (
                <Text tone="meta" role="body-sm">
                  {type.help}
                </Text>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
