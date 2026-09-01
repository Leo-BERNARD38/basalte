// Le choix d’un document depuis un champ. La même liste que l’écran
// « Médias », dans une fenêtre : un document se sert, il ne s’affiche jamais.

import { useState } from 'react'

import type { DocumentSummary } from '../server/documents.js'
import { DocumentList, DocumentUploadButton } from './Documents.js'
import { Button } from './ui/Button.js'
import { Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Banner, Empty } from './ui/Surface.js'
import { Text } from './ui/Text.js'

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
  const [shown, setShown] = useState(opened)

  // La fenêtre reste montée, seule sa visibilité change : sans cette remise à
  // zéro, l’état initial ne se rejouait jamais et le sélecteur ouvert depuis un
  // second champ proposait le document choisi pour le premier.
  if (shown !== opened) {
    setShown(opened)

    if (opened) {
      setSelected(current)
      setProblem('')
    }
  }

  return (
    <Modal
      opened={opened}
      title="Choisir un document"
      onClose={onClose}
      foot={
        <>
          <DocumentUploadButton
            tone="line"
            label="Importer"
            onDone={(added) => {
              setSelected(added.key)
              onChanged()
            }}
            onError={setProblem}
          />
          <Spacer />
          <Button onClick={onClose}>Annuler</Button>
          <Button
            tone="ink"
            disabled={selected === ''}
            onClick={() => onChoose(selected)}
          >
            Employer ce document
          </Button>
        </>
      }
    >
      <Stack>
        {problem !== '' && (
          <Banner tone="refused">
            <Stack gap="sm">
              <strong>La demande a été refusée</strong>
              <Text tone="muted">{problem}</Text>
            </Stack>
          </Banner>
        )}

        <DocumentList
          documents={documents}
          selected={selected}
          empty={
            <Empty
              title="Aucun document"
              note="Importez-en un depuis votre ordinateur."
            />
          }
          onSelect={setSelected}
        />
      </Stack>
    </Modal>
  )
}
