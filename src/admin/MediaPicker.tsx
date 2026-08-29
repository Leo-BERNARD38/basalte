// Le choix d’une image depuis un champ. La même grille que l’écran « Médias »,
// dans une fenêtre : le client n’a jamais deux médiathèques à apprendre.

import { Alert, Button, Group, Modal, Stack } from '@mantine/core'
import { useState } from 'react'

import type { MediaSummary } from '../server/library.js'
import { MediaGrid, UploadButton } from './Media.js'

export function MediaPicker({
  opened,
  media,
  current,
  onChanged,
  onClose,
  onChoose,
}: {
  readonly opened: boolean
  readonly media: readonly MediaSummary[]
  readonly current: string
  readonly onChanged: () => void
  readonly onClose: () => void
  readonly onChoose: (key: string) => void
}) {
  const [selected, setSelected] = useState(current)
  const [problem, setProblem] = useState('')

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Choisir une image"
      size="xl"
      centered
    >
      <Stack gap="md">
        {problem !== '' && (
          <Alert color="red" variant="light">
            {problem}
          </Alert>
        )}

        <MediaGrid media={media} selected={selected} onSelect={setSelected} />

        <Group justify="space-between">
          <UploadButton
            onDone={(added) => {
              setSelected(added.key)
              onChanged()
            }}
            onError={setProblem}
          />
          <Group>
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button
              disabled={selected === ''}
              onClick={() => onChoose(selected)}
            >
              Employer cette image
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
