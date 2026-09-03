// L’écran « Médias » : le rangement de ce que le site montre, et rien de plus.
// On y décrit une image, on y désigne son sujet, on y voit où elle sert, on
// l’y supprime. Poser une image sur une page se fait dans l’écran « Édition »,
// où la bibliothèque s’ouvre par-dessus la page — c’est là que le client sait
// ce qu’il est en train de remplir.
//
// Le sujet se désigne plutôt qu’il ne se découpe : le rendu cadre l’image
// autour de ce point, ce qui résout les visages coupés sans qu’aucune image
// dérivée n’existe.
//
// Rien ne s’y enregistre à la main : une description quittée et un point posé
// partent aussitôt. C’est ce que l’en-tête annonce en n’offrant pas ses deux
// boutons sur cet écran-là.
//
// Les documents partagent cet écran plutôt qu’un sixième onglet (D63), et ne
// s’y montrent que si le site les accepte.

import { useId, useRef, useState } from 'react'

import type { PanelPayload } from '../server/panel.js'
import type { MediaSummary } from '../server/library.js'
import { deleteMedia, updateMedia } from './api.js'
import { DocumentPanel, DocumentUploadButton } from './Documents.js'
import { useEditing } from './editing.js'
import { MediaGrid, preview, UploadButton, usageLabel } from './Media.js'
import { Places, placesOf, type Place } from './places.js'
import { Button } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Banner, Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'
import { Tabs } from './ui/Chip.js'
import { Search } from './ui/icons.js'

const CENTRE = 50

/** Le pas d’une flèche, en pourcentage de l’image. */
const STEP = 2

type Focal = { readonly x: number; readonly y: number }

type View = 'images' | 'documents'

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

export function MediaLibrary({
  payload,
  onOpen,
  onChanged,
}: {
  readonly payload: PanelPayload
  /** Ce que fait une ligne de « Utilisée dans » : elle ouvre ce qu’elle nomme. */
  readonly onOpen: (place: Place) => void
  readonly onChanged: () => void
}) {
  const editing = useEditing()
  const detail = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>('images')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [chosenDocument, setChosenDocument] = useState('')
  const [problem, setProblem] = useState('')

  const asked = search.trim().toLowerCase()
  const entry = payload.media.find((item) => item.key === selected)

  const media = payload.media.filter((item) =>
    Object.values(item.alt).join(' ').toLowerCase().includes(asked),
  )

  const documents = payload.documents.filter((item) =>
    item.name.toLowerCase().includes(asked),
  )

  const images = view === 'images'

  return (
    <Stack>
      {problem !== '' && (
        <Banner tone="refused">
          <Stack gap="sm">
            <strong>La demande a été refusée</strong>
            <Text tone="muted">{problem}</Text>
            <Group>
              <button
                type="button"
                className="basalte-link"
                onClick={() => setProblem('')}
              >
                fermer
              </button>
            </Group>
          </Stack>
        </Banner>
      )}

      <Group wrap>
        {editing.capabilities.documents && (
          <Tabs
            value={view}
            items={[
              { value: 'images', label: 'Images' },
              { value: 'documents', label: 'Documents' },
            ]}
            onChange={setView}
            label="Ce que l’écran range"
          />
        )}

        <span className="basalte-search">
          <Search size={18} />
          <TextField
            value={search}
            aria-label={
              images ? 'Rechercher une image' : 'Rechercher un document'
            }
            placeholder="Rechercher"
            onChange={(event) => setSearch(event.target.value)}
          />
        </span>

        <Spacer />

        {images ? (
          <UploadButton
            onDone={(added) => {
              setProblem('')
              setSelected(added.key)
              onChanged()
            }}
            onError={setProblem}
          />
        ) : (
          <DocumentUploadButton
            onDone={(added) => {
              setProblem('')
              setChosenDocument(added.key)
              onChanged()
            }}
            onError={setProblem}
          />
        )}
      </Group>

      <div className="basalte-library">
        {images ? (
          <>
            <MediaGrid
              media={media}
              selected={selected}
              columns={6}
              flag={(item) =>
                item.usage === 0 ? 'jamais utilisée' : undefined
              }
              empty={
                asked === '' ? (
                  <Empty
                    title="Aucune image pour l’instant"
                    note="Ajoutez-en une : elle se rangera ici, et l’onglet « Édition » pourra la poser sur une page."
                  />
                ) : (
                  <Empty
                    title="Aucune image ne répond à cette recherche"
                    note="La recherche porte sur le texte alternatif des images."
                  />
                )
              }
              onSelect={(key) => {
                setSelected(key)
                requestAnimationFrame(() =>
                  detail.current?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth',
                  }),
                )
              }}
            />

            {/* Sur un écran étroit, le panneau se range sous la grille, et
                la vignette choisie l’amène en vue : sans ce défilement, le
                client cliquait et ne voyait rien changer. */}
            <div className="basalte-aside" ref={detail}>
              {entry === undefined ? (
                <Empty
                  title="Aucune image choisie"
                  note="Cliquez une vignette : sa description, son sujet et les pages où elle sert s’ouvrent ici."
                />
              ) : (
                <MediaDetail
                  key={entry.key}
                  entry={entry}
                  languages={editing.languages}
                  places={placesOf(payload, entry.key)}
                  onOpen={onOpen}
                  onChanged={onChanged}
                  onDeleted={() => {
                    setSelected('')
                    onChanged()
                  }}
                  onError={setProblem}
                />
              )}
            </div>
          </>
        ) : (
          <DocumentPanel
            documents={documents}
            selected={chosenDocument}
            searching={asked !== ''}
            places={placesOf(payload, chosenDocument, 'document')}
            onSelect={setChosenDocument}
            onOpen={onOpen}
            onChanged={onChanged}
            onError={setProblem}
          />
        )}
      </div>
    </Stack>
  )
}

function MediaDetail({
  entry,
  languages,
  places,
  onOpen,
  onChanged,
  onDeleted,
  onError,
}: {
  readonly entry: MediaSummary
  readonly languages: readonly {
    readonly code: string
    readonly label: string
  }[]
  readonly places: readonly Place[]
  readonly onOpen: (place: Place) => void
  readonly onChanged: () => void
  readonly onDeleted: () => void
  readonly onError: (message: string) => void
}) {
  const name = useId()
  const [alt, setAlt] = useState<Record<string, string>>({ ...entry.alt })
  const [focal, setFocal] = useState<Focal>(
    entry.focal ?? { x: CENTRE, y: CENTRE },
  )
  const [changed, setChanged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState(false)
  const [saved, setSaved] = useState(false)

  const send = async (next: {
    readonly alt: Record<string, string>
    readonly focal: Focal
  }) => {
    setBusy(true)

    const answer = await updateMedia(entry.key, next)

    setBusy(false)

    if (answer.ok) {
      setSaved(true)
      onChanged()

      return
    }

    onError(answer.message)
  }

  /** Ce qui part en quittant un champ : la frappe ne fait pas une requête. */
  const keep = () => {
    if (!changed) return

    setChanged(false)
    void send({ alt, focal })
  }

  const drop = async () => {
    setAsked(false)
    setBusy(true)

    const answer = await deleteMedia(entry.key)

    setBusy(false)

    if (answer.ok) onDeleted()
    else onError(answer.message)
  }

  // Entrée et Espace sur un bouton produisent un clic dont les coordonnées
  // valent zéro : le poser tel quel enverrait le point dans le coin haut
  // gauche. Le clavier a les flèches ; seul un vrai pointeur vise ici.
  const aim = (event: React.MouseEvent<HTMLElement>) => {
    if (event.detail === 0) return

    const box = event.currentTarget.getBoundingClientRect()
    const next = {
      x: clamp(Math.round(((event.clientX - box.left) / box.width) * 100)),
      y: clamp(Math.round(((event.clientY - box.top) / box.height) * 100)),
    }

    setChanged(false)
    setFocal(next)
    void send({ alt, focal: next })
  }

  // Le point se déplace aussi aux flèches : une image qu’on ne cadre qu’à la
  // souris laisse dehors qui ne s’en sert pas. Ce qu’elles posent part en
  // quittant l’image, comme une description quittée.
  const nudge = (event: React.KeyboardEvent) => {
    const moves: Readonly<Record<string, Focal>> = {
      ArrowLeft: { x: focal.x - STEP, y: focal.y },
      ArrowRight: { x: focal.x + STEP, y: focal.y },
      ArrowUp: { x: focal.x, y: focal.y - STEP },
      ArrowDown: { x: focal.x, y: focal.y + STEP },
    }

    const next = moves[event.key]

    if (next === undefined) return

    event.preventDefault()
    setSaved(false)
    setChanged(true)
    setFocal({ x: clamp(next.x), y: clamp(next.y) })
  }

  return (
    <Card>
      <Stack>
        <Group gap="md">
          <Title role="title-md">Cette image</Title>
          <Spacer />
          {saved && !busy && (
            <Text tone="meta" role="label-md">
              Enregistré
            </Text>
          )}
        </Group>

        <button
          type="button"
          className="basalte-focal"
          aria-label="Point de l’image que le cadrage garde visible"
          aria-describedby={`${name}-focal`}
          onClick={aim}
          onKeyDown={nudge}
          onBlur={keep}
        >
          <img src={preview(entry)} alt="" draggable={false} />
          <span
            className="basalte-focal__dot"
            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          />
        </button>

        <Mono>
          {entry.width} × {entry.height} · {entry.widths.length} largeurs ·{' '}
          {entry.format} · {usageLabel(entry.usage).toLowerCase()}
        </Mono>

        {languages.map((language) => (
          <Field
            key={language.code}
            label={
              languages.length > 1
                ? `Texte alternatif (${language.label})`
                : 'Texte alternatif'
            }
            hint="Ce que lisent les personnes qui ne voient pas l’image."
          >
            {(bound) => (
              <TextField
                {...bound}
                value={alt[language.code] ?? ''}
                onChange={(event) => {
                  setSaved(false)
                  setChanged(true)
                  setAlt({ ...alt, [language.code]: event.target.value })
                }}
                onBlur={keep}
              />
            )}
          </Field>
        ))}

        <Places
          places={places}
          none="Aucune page ne l’emploie pour l’instant."
          onOpen={onOpen}
        />

        <Stack gap="xs">
          <Eyebrow>Point focal</Eyebrow>
          <Text id={`${name}-focal`} tone="muted" role="label-md">
            Cliquez le sujet de l’image, ou déplacez le point aux flèches :
            c’est lui que le cadrage garde toujours visible, quel que soit le
            format de l’emplacement. Il est à {focal.x} % depuis la gauche et{' '}
            {focal.y} % depuis le haut.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Group>
            <Button
              variant="text"
              tone="error"
              busy={busy}
              disabled={entry.usage > 0}
              onClick={() => setAsked(true)}
            >
              Supprimer cette image
            </Button>
          </Group>
          {entry.usage > 0 && (
            <Text tone="meta" role="label-md">
              Une section l’emploie : retirez-la d’abord de la page.
            </Text>
          )}
        </Stack>
      </Stack>

      <Modal
        opened={asked}
        title="Supprimer cette image"
        onClose={() => setAsked(false)}
        foot={
          <>
            <Spacer />
            <Button onClick={() => setAsked(false)}>La garder</Button>
            <Button variant="text" tone="error" onClick={() => void drop()}>
              Supprimer
            </Button>
          </>
        }
      >
        <Text tone="muted">
          Le fichier et toutes ses largeurs seront effacés du dépôt. Rien ne les
          garde ailleurs.
        </Text>
      </Modal>
    </Card>
  )
}
