// La liste des documents et leur téléversement, partagés par l’écran
// « Médias » et par le choix d’un document depuis un champ.
//
// Un document n’a rien à décrire : il n’est jamais affiché, seulement
// téléchargé. Le nom du fichier est donc tout ce que le client voit, et c’est
// aussi tout ce que le manifeste retient.

import { useRef, useState, type ReactNode } from 'react'

import { documentUrl, documentWeight, DOCUMENT_TYPE } from '../media/resolve.js'
import type { DocumentSummary } from '../server/documents.js'
import { deleteDocument, uploadDocument } from './api.js'
import { Places, type Place } from './places.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Row, RowText } from './ui/Row.js'
import { Card, Empty } from './ui/Surface.js'
import { Mono, Text, Title } from './ui/Text.js'

export function DocumentList({
  documents,
  selected,
  empty,
  onSelect,
}: {
  readonly documents: readonly DocumentSummary[]
  readonly selected: string
  readonly empty: ReactNode
  readonly onSelect: (key: string) => void
}) {
  if (documents.length === 0) return <>{empty}</>

  return (
    <Stack gap="xs">
      {documents.map((entry) => (
        <Row
          key={entry.key}
          current={entry.key === selected}
          onClick={() => onSelect(entry.key)}
        >
          <RowText>{entry.name}</RowText>
          {entry.usage === 0 && <Mark>jamais utilisé</Mark>}
          <Text tone="meta" size="eyebrow">
            {documentWeight(entry.bytes)}
          </Text>
        </Row>
      ))}
    </Stack>
  )
}

function usageLabel(usage: number): string {
  if (usage === 0) return 'jamais utilisé'
  if (usage === 1) return 'utilisé une fois'

  return `utilisé ${usage} fois`
}

export function DocumentUploadButton({
  label = 'Ajouter un document',
  tone = 'ink',
  onDone,
  onError,
}: {
  readonly label?: string | undefined
  readonly tone?: 'ink' | 'line' | undefined
  readonly onDone: (document: DocumentSummary) => void
  readonly onError: (message: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const send = async (file: File | undefined) => {
    if (file === undefined) return

    setBusy(true)

    const answer = await uploadDocument(file)

    setBusy(false)

    if (answer.ok) onDone(answer.data.document)
    else onError(answer.message)
  }

  return (
    <>
      {/* Le champ de fichier reste caché : c’est le bouton qui porte l’allure
          du panel, et un champ de fichier ne s’habille pas. */}
      <input
        ref={input}
        type="file"
        accept={DOCUMENT_TYPE}
        hidden
        onChange={(event) => {
          void send(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Button tone={tone} busy={busy} onClick={() => input.current?.click()}>
        {label}
      </Button>
    </>
  )
}

/**
 * Les deux colonnes de l’onglet « Documents » : la liste, et ce que le
 * document choisi porte. Elles se posent dans la grille de l’écran, qui tient
 * déjà la liste des images et leur panneau.
 */
export function DocumentPanel({
  documents,
  selected,
  searching,
  places,
  onSelect,
  onOpen,
  onChanged,
  onError,
}: {
  readonly documents: readonly DocumentSummary[]
  readonly selected: string
  /** Une liste vide ne dit pas la même chose selon qu’on cherche ou non. */
  readonly searching: boolean
  readonly places: readonly Place[]
  readonly onSelect: (key: string) => void
  readonly onOpen: (place: Place) => void
  readonly onChanged: () => void
  readonly onError: (message: string) => void
}) {
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
      onSelect('')
      onChanged()
      return
    }

    onError(answer.message)
  }

  return (
    <>
      <DocumentList
        documents={documents}
        selected={selected}
        empty={
          searching ? (
            <Empty
              title="Aucun document ne répond à cette recherche"
              note="La recherche porte sur le nom du fichier."
            />
          ) : (
            <Empty
              title="Aucun document pour l’instant"
              note="Ajoutez-en un : les sections qui proposent un téléchargement pourront y mener."
            />
          )
        }
        onSelect={onSelect}
      />

      <div className="basalte-rail">
        {entry === undefined ? (
          <Empty
            title="Aucun document choisi"
            note="Cliquez une ligne : son poids, les pages qui y mènent et sa suppression s’ouvrent ici."
          />
        ) : (
          <Card>
            <Stack>
              <Title rank="card">{entry.name}</Title>

              <Mono>
                {documentWeight(entry.bytes)} · {usageLabel(entry.usage)}
              </Mono>

              <Group>
                <a
                  className="basalte-link"
                  href={documentUrl(entry.key)}
                  download={entry.name}
                >
                  Télécharger ce document
                </a>
              </Group>

              <Places
                title="Utilisé dans"
                places={places}
                none="Aucune page n’y mène pour l’instant."
                onOpen={onOpen}
              />

              <Stack gap="xs">
                <Group>
                  <Button
                    tone="danger"
                    busy={busy}
                    disabled={entry.usage > 0}
                    onClick={() => setAsked(true)}
                  >
                    Supprimer ce document
                  </Button>
                </Group>
                {entry.usage > 0 && (
                  <Text tone="meta" size="small">
                    Une section y mène : retirez-le d’abord de la page.
                  </Text>
                )}
              </Stack>
            </Stack>

            <Modal
              opened={asked}
              title="Supprimer ce document"
              onClose={() => setAsked(false)}
              foot={
                <Group>
                  <Spacer />
                  <Button onClick={() => setAsked(false)}>Le garder</Button>
                  <Button tone="danger" onClick={() => void drop()}>
                    Supprimer
                  </Button>
                </Group>
              }
            >
              <Text tone="muted">
                « {entry.name} » sera effacé du dépôt. Les liens qui y menaient
                ne mèneront plus nulle part.
              </Text>
            </Modal>
          </Card>
        )}
      </div>
    </>
  )
}
