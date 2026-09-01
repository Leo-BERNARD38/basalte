// Le choix d’une image depuis un champ. La même grille que l’écran « Médias »,
// dans une fenêtre : le client n’a jamais deux médiathèques à apprendre.
//
// C’est ici, et seulement ici, qu’un format attendu est connu : la médiathèque
// ne déclare aucun ratio, c’est l’emplacement qui le fait. Une image qui ne le
// tient pas n’est donc pas refusée — elle s’emploie en la recadrant, sans
// quitter l’écran.

import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import { matchesRatio } from '../media/ratio.js'
import type { MediaSummary } from '../server/library.js'
import { CropDialog } from './CropDialog.js'
import { MediaGrid, UploadButton } from './Media.js'

export function MediaPicker({
  opened,
  media,
  current,
  ratio,
  onChanged,
  onClose,
  onChoose,
}: {
  readonly opened: boolean
  readonly media: readonly MediaSummary[]
  readonly current: string
  readonly ratio: string | undefined
  readonly onChanged: () => void
  readonly onClose: () => void
  readonly onChoose: (key: string) => void
}) {
  const [selected, setSelected] = useState(current)
  const [problem, setProblem] = useState('')
  const [cropping, setCropping] = useState(false)
  const [shown, setShown] = useState(opened)

  // La fenêtre reste montée, seule sa visibilité change : sans cette remise à
  // zéro, l’état initial ne se rejouait jamais et le sélecteur ouvert depuis un
  // second champ proposait l’image choisie pour le premier.
  if (shown !== opened) {
    setShown(opened)

    if (opened) {
      setSelected(current)
      setProblem('')
      setCropping(false)
    }
  }

  const entry = media.find((item) => item.key === selected)
  const fits =
    ratio === undefined || entry === undefined || matchesRatio(entry, ratio)

  // Recadrer repart toujours de l’originale : une image déjà recadrée rouvre sa
  // source et son cadre, de sorte qu’aucune chaîne de découpes ne s’accumule.
  const origin =
    entry === undefined
      ? undefined
      : (media.find((item) => item.key === entry.source) ?? entry)

  return (
    <>
      <Modal
        opened={opened && !cropping}
        onClose={onClose}
        title="Choisir une image"
        size="xl"
        centered
      >
        <Stack gap="md">
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

          {ratio !== undefined && (
            <Text size="sm" c="dimmed">
              Cet emplacement attend des proportions {ratio}. Une image d’un
              autre format se recadre ici, et l’originale est conservée.
            </Text>
          )}

          <MediaGrid media={media} selected={selected} onSelect={setSelected} />

          {entry !== undefined && !fits && (
            <Alert color="orange" title="Format inattendu">
              Cette image est en {entry.width}×{entry.height} : elle n’est pas
              au format attendu. Recadrez-la pour l’employer ici.
            </Alert>
          )}

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
              {ratio !== undefined && entry !== undefined && (
                <Button variant="default" onClick={() => setCropping(true)}>
                  Recadrer
                </Button>
              )}
              <Button
                disabled={selected === '' || !fits}
                onClick={() => onChoose(selected)}
              >
                Employer cette image
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <CropDialog
        origin={cropping ? origin : undefined}
        start={entry?.crop}
        ratio={ratio ?? ''}
        onClose={() => setCropping(false)}
        onError={(message) => {
          setProblem(message)
          setCropping(false)
        }}
        onDone={(added) => {
          setCropping(false)
          setSelected(added.key)
          onChanged()
        }}
      />
    </>
  )
}
