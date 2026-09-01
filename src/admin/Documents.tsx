// La liste des documents et leur téléversement, partagés par l’écran
// « Médias » et par le choix d’un document depuis un champ.
//
// Un document n’a rien à décrire : il n’est jamais affiché, seulement
// téléchargé. Le nom du fichier est donc tout ce que le client voit, et c’est
// aussi tout ce que le manifeste retient.

import {
  Alert,
  Button,
  FileButton,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'

import { documentUrl, documentWeight, DOCUMENT_TYPE } from '../media/resolve.js'
import type { DocumentSummary } from '../server/documents.js'
import { deleteDocument, uploadDocument } from './api.js'

export function DocumentList({
  documents,
  selected,
  onSelect,
}: {
  readonly documents: readonly DocumentSummary[]
  readonly selected: string
  readonly onSelect: (key: string) => void
}) {
  if (documents.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Aucun document déposé.
      </Text>
    )
  }

  return (
    <Stack gap="xs">
      {documents.map((entry) => (
        <UnstyledButton
          key={entry.key}
          onClick={() => onSelect(entry.key)}
          className={
            entry.key === selected
              ? 'basalte-tile basalte-tile-selected'
              : 'basalte-tile'
          }
          p="xs"
        >
          <Text size="sm">{entry.name}</Text>
          <Text size="xs" c="dimmed">
            {documentWeight(entry.bytes)} · {usageLabel(entry.usage)}
          </Text>
        </UnstyledButton>
      ))}
    </Stack>
  )
}

function usageLabel(usage: number): string {
  if (usage === 0) return 'non employé'
  if (usage === 1) return 'employé une fois'

  return `employé ${usage} fois`
}

export function DocumentUploadButton({
  onDone,
  onError,
}: {
  readonly onDone: (document: DocumentSummary) => void
  readonly onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)

  const send = async (file: File | null) => {
    if (file === null) return

    setBusy(true)

    const answer = await uploadDocument(file)

    setBusy(false)

    if (answer.ok) onDone(answer.data.document)
    else onError(answer.message)
  }

  return (
    <FileButton accept={DOCUMENT_TYPE} onChange={(file) => void send(file)}>
      {(props) => (
        <Button {...props} loading={busy}>
          Ajouter un document
        </Button>
      )}
    </FileButton>
  )
}

export function DocumentPanel({
  documents,
  onChanged,
}: {
  readonly documents: readonly DocumentSummary[]
  readonly onChanged: () => void
}) {
  const [problem, setProblem] = useState('')
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState(false)

  const entry = documents.find((item) => item.key === selected)

  const drop = async () => {
    if (entry === undefined) return

    setAsked(false)
    setBusy(true)

    const answer = await deleteDocument(entry.key)

    setBusy(false)

    if (answer.ok) {
      setSelected('')
      onChanged()
      return
    }

    setProblem(answer.message)
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>Documents</Text>
        <DocumentUploadButton
          onDone={(added) => {
            setProblem('')
            setSelected(added.key)
            onChanged()
          }}
          onError={setProblem}
        />
      </Group>

      <Text size="xs" c="dimmed">
        Un document se télécharge, il ne s’affiche jamais dans une page.
      </Text>

      {problem !== '' && (
        <Alert
          color="red"
          title="La demande a été refusée"
          withCloseButton
          onClose={() => setProblem('')}
        >
          {problem}
        </Alert>
      )}

      <DocumentList
        documents={documents}
        selected={selected}
        onSelect={setSelected}
      />

      {entry !== undefined && (
        <Paper p="md">
          <Group justify="space-between" align="center">
            <Button
              component="a"
              href={documentUrl(entry.key)}
              variant="default"
              size="xs"
            >
              Télécharger
            </Button>
            <Stack gap={2} align="flex-end">
              <Button
                variant="subtle"
                color="red"
                size="xs"
                loading={busy}
                disabled={entry.usage > 0}
                onClick={() => setAsked(true)}
              >
                Supprimer
              </Button>
              {entry.usage > 0 && (
                <Text size="xs" c="dimmed">
                  Employé par une section : retirez-le d’abord.
                </Text>
              )}
            </Stack>
          </Group>
        </Paper>
      )}

      <Modal
        opened={asked}
        onClose={() => setAsked(false)}
        title="Supprimer ce document"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            « {entry?.name} » sera effacé du dépôt. Les liens qui y menaient ne
            mèneront plus nulle part.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAsked(false)}>
              Le garder
            </Button>
            <Button color="red" onClick={() => void drop()}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
