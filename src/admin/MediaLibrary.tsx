// L’écran « Médias ». Chaque image y porte ce que le rendu ira chercher : sa
// description par langue et son point focal — réglable plutôt qu’un outil de
// recadrage, ce qui résout les visages coupés pour une fraction du travail.
//
// Les documents partagent cet écran plutôt qu’un sixième onglet (D63), et ne
// s’y montrent que si le site les accepte.

import {
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useId, useState } from 'react'

import type { DocumentSummary } from '../server/documents.js'
import type { MediaSummary } from '../server/library.js'
import { deleteMedia, updateMedia } from './api.js'
import { DocumentPanel } from './Documents.js'
import { useEditing } from './editing.js'
import { MediaGrid, preview, UploadButton } from './Media.js'

const CENTRE = 50

/** Le pas d’une flèche, en pourcentage de l’image. */
const STEP = 2

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

export function MediaLibrary({
  media,
  documents,
  onChanged,
}: {
  readonly media: readonly MediaSummary[]
  readonly documents: readonly DocumentSummary[]
  readonly onChanged: () => void
}) {
  const editing = useEditing()
  const [selected, setSelected] = useState('')
  const [problem, setProblem] = useState('')

  const entry = media.find((item) => item.key === selected)

  return (
    <Stack gap="md">
      <Group justify="flex-end" align="center">
        <UploadButton
          onDone={(added) => {
            setProblem('')
            setSelected(added.key)
            onChanged()
          }}
          onError={setProblem}
        />
      </Group>

      {problem !== '' && (
        <Alert
          color="red"

          onClose={() => setProblem('')}
          withCloseButton
        >
          {problem}
        </Alert>
      )}

      <MediaGrid media={media} selected={selected} onSelect={setSelected} />

      {entry !== undefined && (
        <MediaDetail
          key={entry.key}
          entry={entry}
          languages={editing.languages}
          onChanged={onChanged}
          onDeleted={() => {
            setSelected('')
            onChanged()
          }}
          onError={setProblem}
        />
      )}

      {editing.capabilities.documents && (
        <DocumentPanel documents={documents} onChanged={onChanged} />
      )}
    </Stack>
  )
}

function MediaDetail({
  entry,
  languages,
  onChanged,
  onDeleted,
  onError,
}: {
  readonly entry: MediaSummary
  readonly languages: readonly {
    readonly code: string
    readonly label: string
  }[]
  readonly onChanged: () => void
  readonly onDeleted: () => void
  readonly onError: (message: string) => void
}) {
  const name = useId()
  const [alt, setAlt] = useState<Record<string, string>>({ ...entry.alt })
  const [focal, setFocal] = useState(entry.focal ?? { x: CENTRE, y: CENTRE })
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)

    const answer = await updateMedia(entry.key, { alt, focal })

    setBusy(false)

    if (answer.ok) onChanged()
    else onError(answer.message)
  }

  const drop = async () => {
    setBusy(true)

    const answer = await deleteMedia(entry.key)

    setBusy(false)

    if (answer.ok) onDeleted()
    else onError(answer.message)
  }

  const aim = (event: React.MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()

    setFocal({
      x: clamp(Math.round(((event.clientX - box.left) / box.width) * 100)),
      y: clamp(Math.round(((event.clientY - box.top) / box.height) * 100)),
    })
  }

  // Le point se déplace aussi aux flèches, comme le cadre de recadrage : une
  // image qu’on ne cadre qu’à la souris laisse dehors qui ne s’en sert pas.
  const nudge = (event: React.KeyboardEvent) => {
    const moves: Readonly<Record<string, { x: number; y: number }>> = {
      ArrowLeft: { x: focal.x - STEP, y: focal.y },
      ArrowRight: { x: focal.x + STEP, y: focal.y },
      ArrowUp: { x: focal.x, y: focal.y - STEP },
      ArrowDown: { x: focal.x, y: focal.y + STEP },
    }

    const next = moves[event.key]

    if (next === undefined) return

    event.preventDefault()
    setFocal({ x: clamp(next.x), y: clamp(next.y) })
  }

  return (
    <Paper p="md">
      <Stack gap="md">
        <Title order={4}>Cette image</Title>

        <button
          type="button"
          className="basalte-focal"
          aria-label="Point de l’image que le cadrage garde visible"
          aria-describedby={`${name}-focal`}
          onClick={aim}
          onKeyDown={nudge}
        >
          <img src={preview(entry)} alt="" draggable={false} />
          <span style={{ left: `${focal.x}%`, top: `${focal.y}%` }} />
        </button>

        <Text id={`${name}-focal`} size="xs" c="dimmed">
          Cliquez sur le sujet de l’image, ou déplacez le point aux flèches :
          c’est lui que le cadrage garde toujours visible. Il est à {focal.x} %
          depuis la gauche et {focal.y} % depuis le haut. {entry.width} ×{' '}
          {entry.height} pixels, {entry.widths.length} largeurs produites.
        </Text>

        {languages.map((language) => (
          <TextInput
            key={language.code}
            label={
              languages.length > 1
                ? `Description (${language.label})`
                : 'Description'
            }
            value={alt[language.code] ?? ''}
            onChange={(event) =>
              setAlt({ ...alt, [language.code]: event.currentTarget.value })
            }
          />
        ))}

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            loading={busy}
            disabled={entry.usage > 0}
            onClick={drop}
          >
            {entry.usage > 0 ? 'Employée par une section' : 'Supprimer'}
          </Button>
          <Button loading={busy} onClick={save}>
            Enregistrer l’image
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
