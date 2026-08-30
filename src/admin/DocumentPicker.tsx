// Le choix d’un document depuis un champ. La même liste que l’écran
// « Médias », dans une fenêtre.

import { Alert, Button, Group, Modal, Stack } from '@mantine/core'
import { useState } from 'react'

import type { DocumentSummary } from '../server/documents.js'
import { DocumentList, DocumentUploadButton } from './Documents.js'

export function DocumentPicker({
  opened,
  documents,
  current,
  onChanged,
  onClose,
  onChoose,
}: {
  readonly opened: boolean
  readonly documents: readonly DocumentSummary[]
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
      title="Choisir un document"
      size="lg"
      centered
    >
      <Stack gap="md">
        {problem !== '' && <Alert color="red">{problem}</Alert>}

        <DocumentList
          documents={documents}
          selected={selected}
          onSelect={setSelected}
        />

        <Group justify="space-between">
          <DocumentUploadButton
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
              Employer ce document
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
