// La grille de la médiathèque et le téléversement, partagés par l’écran
// « Médias » et par le choix d’une image depuis un champ.
//
// Le texte alternatif est demandé avant l’envoi, dans chaque langue en ligne :
// c’est la seule occasion où le client a l’image sous les yeux.

import {
  Button,
  FileButton,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'

import { fileName, MEDIA_URL } from '../media/resolve.js'
import type { MediaSummary } from '../server/library.js'
import { uploadMedia } from './api.js'
import { translated } from './draft.js'
import { useEditing } from './editing.js'

export function thumbnail(entry: MediaSummary): string {
  return `${MEDIA_URL}/${fileName(entry.key, entry.widths[0] ?? entry.width)}`
}

export function MediaGrid({
  media,
  selected,
  onSelect,
}: {
  readonly media: readonly MediaSummary[]
  readonly selected: string
  readonly onSelect: (key: string) => void
}) {
  const editing = useEditing()

  if (media.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        La médiathèque est vide.
      </Text>
    )
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
      {media.map((entry) => (
        <UnstyledButton
          key={entry.key}
          onClick={() => onSelect(entry.key)}
          className={
            entry.key === selected
              ? 'basalte-tile basalte-tile-selected'
              : 'basalte-tile'
          }
        >
          <Image
            src={thumbnail(entry)}
            alt={translated(entry.alt, editing.language)}
            h={120}
            fit="cover"
            radius="sm"
          />
          <Text size="xs" lineClamp={2} mt={4}>
            {translated(entry.alt, editing.language) || 'Sans description'}
          </Text>
          <Text size="xs" c="dimmed">
            {usageLabel(entry.usage)}
          </Text>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  )
}

function usageLabel(usage: number): string {
  if (usage === 0) return 'Non utilisée'
  if (usage === 1) return 'Utilisée une fois'

  return `Utilisée ${usage} fois`
}

type Chosen = {
  readonly file: File
  /** Adresse d’objet du fichier local, à rendre quand il change. */
  readonly preview: string
}

export function UploadButton({
  onDone,
  onError,
}: {
  readonly onDone: (media: MediaSummary) => void
  readonly onError: (message: string) => void
}) {
  const editing = useEditing()
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
  const pick = (file: File | null) => {
    if (chosen !== undefined) URL.revokeObjectURL(chosen.preview)

    setChosen(
      file === null ? undefined : { file, preview: URL.createObjectURL(file) },
    )
  }

  const close = () => {
    pick(null)
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
      <FileButton
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
        onChange={pick}
      >
        {(props) => <Button {...props}>Ajouter une image</Button>}
      </FileButton>

      <Modal
        opened={chosen !== undefined}
        onClose={close}
        title="Décrire l’image"
        centered
      >
        <Stack gap="md">
          {chosen !== undefined && (
            <Image
              src={chosen.preview}
              alt=""
              mah={220}
              fit="contain"
              radius="sm"
            />
          )}

          <Text size="sm" c="dimmed">
            Décris ce que montre l’image : c’est ce que lisent les personnes qui
            ne la voient pas, et ce que comprend Google.
          </Text>

          {online.map((language) => (
            <TextInput
              key={language.code}
              label={
                online.length > 1
                  ? `Description (${language.label})`
                  : 'Description'
              }
              required
              value={alt[language.code] ?? ''}
              onChange={(event) =>
                setAlt({ ...alt, [language.code]: event.currentTarget.value })
              }
            />
          ))}

          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Annuler
            </Button>
            <Button disabled={!complete} loading={busy} onClick={send}>
              Ajouter
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
