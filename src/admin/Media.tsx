// La grille de la médiathèque et le téléversement, partagés par l’écran
// « Médias » et par le choix d’une image depuis un champ.
//
// La vignette ne porte que l’image : sa description, ses dimensions et les
// endroits où elle sert se lisent dans le panneau de droite, sur celle qu’on
// vient de désigner. Ce qui reste sur la vignette est ce qui doit se voir sans
// la choisir — une image que rien n’emploie encore.
//
// Le texte alternatif est demandé avant l’envoi, dans chaque langue en ligne :
// c’est la seule occasion où le client a l’image sous les yeux.

import { useRef, useState, type ReactNode } from 'react'

import { fileName, MEDIA_URL } from '../media/resolve.js'
import type { MediaSummary } from '../server/library.js'
import { uploadMedia } from './api.js'
import { translated } from './draft.js'
import { useEditing } from './editing.js'
import { Button } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Text } from './ui/Text.js'

/** Ce qu’un navigateur propose au client, et rien d’autre : le SVG est refusé. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif,image/tiff'

export function thumbnail(entry: MediaSummary): string {
  return `${MEDIA_URL}/${fileName(entry.key, entry.widths[0] ?? entry.width)}`
}

/**
 * Une taille intermédiaire, pour les écrans qui montrent l’image plutôt que sa
 * vignette : le point focal se règle mal sur 480 pixels, et la plus grande
 * largeur pèse pour rien dans une fenêtre.
 */
export function preview(entry: MediaSummary): string {
  const width =
    [...entry.widths].reverse().find((value) => value <= 1200) ?? entry.width

  return `${MEDIA_URL}/${fileName(entry.key, width)}`
}

export function MediaGrid({
  media,
  selected,
  columns,
  flag,
  slot,
  empty,
  onSelect,
}: {
  readonly media: readonly MediaSummary[]
  readonly selected: string
  /** Six colonnes sur l’écran, quatre dans la fenêtre, qui est plus étroite. */
  readonly columns: 4 | 6
  /** Ce qu’une vignette dit d’elle-même sans qu’on la choisisse. */
  readonly flag?: ((entry: MediaSummary) => string | undefined) | undefined
  /** L’emplacement vide qui ferme la grille. */
  readonly slot?: ReactNode | undefined
  readonly empty: ReactNode
  readonly onSelect: (key: string) => void
}) {
  const editing = useEditing()

  if (media.length === 0) return <>{empty}</>

  return (
    <div className="basalte-tiles" data-cols={columns}>
      {media.map((entry) => {
        const marked = flag?.(entry)

        return (
          <button
            key={entry.key}
            type="button"
            className="basalte-tile"
            data-on={entry.key === selected ? 'true' : undefined}
            aria-pressed={entry.key === selected}
            onClick={() => onSelect(entry.key)}
          >
            <img
              className="basalte-tile__image"
              src={thumbnail(entry)}
              alt={
                translated(entry.alt, editing.language) || 'Sans description'
              }
              draggable={false}
            />
            {marked !== undefined && (
              <span className="basalte-tile__flag">{marked}</span>
            )}
          </button>
        )
      })}
      {slot}
    </div>
  )
}

export function usageLabel(usage: number): string {
  if (usage === 0) return 'Jamais utilisée'
  if (usage === 1) return 'Utilisée une fois'

  return `Utilisée ${usage} fois`
}

type Chosen = {
  readonly file: File
  /** Adresse d’objet du fichier local, à rendre quand il change. */
  readonly preview: string
}

export function UploadButton({
  label = 'Ajouter une image',
  tone = 'ink',
  onDone,
  onError,
}: {
  readonly label?: string | undefined
  readonly tone?: 'ink' | 'line' | undefined
  readonly onDone: (media: MediaSummary) => void
  readonly onError: (message: string) => void
}) {
  const editing = useEditing()
  const input = useRef<HTMLInputElement>(null)
  const [chosen, setChosen] = useState<Chosen | undefined>(undefined)
  const [alt, setAlt] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const online = editing.languages.filter((language) => !language.draft)
  const complete = online.every(
    (language) => (alt[language.code] ?? '').trim() !== '',
  )

  // L’aperçu vit sur une adresse d’objet, créée une fois par fichier et rendue
  // dès qu’il change : fabriquée au rendu, elle laisserait une image en
  // mémoire à chaque frappe dans la description.
  const pick = (file: File | undefined) => {
    if (chosen !== undefined) URL.revokeObjectURL(chosen.preview)

    setChosen(
      file === undefined
        ? undefined
        : { file, preview: URL.createObjectURL(file) },
    )
  }

  const close = () => {
    pick(undefined)
    setAlt({})
  }

  const send = async () => {
    if (chosen === undefined) return

    setBusy(true)

    const answer = await uploadMedia(chosen.file, alt)

    setBusy(false)

    if (answer.ok) {
      onDone(answer.data.media)
      close()
      return
    }

    onError(answer.message)
  }

  return (
    <>
      {/* Le champ de fichier reste caché : c’est le bouton qui porte l’allure
          du panel, et un champ de fichier ne s’habille pas. */}
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES}
        hidden
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Button tone={tone} onClick={() => input.current?.click()}>
        {label}
      </Button>

      <Modal
        opened={chosen !== undefined}
        title="Décrire l’image"
        note={
          <Text tone="muted" size="small">
            Décrivez ce que montre l’image : c’est ce que lisent les personnes
            qui ne la voient pas, et ce que comprend Google.
          </Text>
        }
        onClose={close}
        foot={
          <Group>
            <Spacer />
            <Button onClick={close}>Annuler</Button>
            <Button
              tone="ink"
              disabled={!complete}
              busy={busy}
              onClick={() => void send()}
            >
              Ajouter
            </Button>
          </Group>
        }
      >
        <Stack>
          {chosen !== undefined && (
            <img
              className="basalte-tile__image"
              src={chosen.preview}
              alt=""
              draggable={false}
            />
          )}

          {online.map((language) => (
            <Field
              key={language.code}
              label={
                online.length > 1
                  ? `Description (${language.label})`
                  : 'Description'
              }
              required
            >
              {(bound) => (
                <TextField
                  {...bound}
                  value={alt[language.code] ?? ''}
                  onChange={(event) =>
                    setAlt({ ...alt, [language.code]: event.target.value })
                  }
                />
              )}
            </Field>
          ))}
        </Stack>
      </Modal>
    </>
  )
}
