// Le choix d’une image depuis un champ. La même grille que l’écran « Médias »,
// dans une fenêtre : le client n’a jamais deux médiathèques à apprendre.
//
// La fenêtre pose l’image, l’écran la range — texte alternatif, point focal,
// suppression. C’est la seule division à tenir, et le pied de la fenêtre la
// rappelle.
//
// Aucun format n’est refusé ici. Un emplacement attend des proportions, mais
// le site cadre autour du point focal (D178) : une image d’une autre forme s’y
// emploie, et c’est le point focal qu’on corrige si le cadrage déplaît.

import { useState } from 'react'

import type { MediaSummary } from '../server/library.js'
import type { PanelPayload } from '../server/panel.js'
import { MediaGrid, UploadButton } from './Media.js'
import { placesOf } from './places.js'
import { Button } from './ui/Button.js'
import { TextField } from './ui/Field.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Banner, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, Text } from './ui/Text.js'
import { Segmented } from './ui/Toggle.js'

type Filter = 'all' | 'unused'

export function MediaPicker({
  opened,
  payload,
  current,
  ratio,
  onChanged,
  onClose,
  onChoose,
}: {
  readonly opened: boolean
  readonly payload: PanelPayload
  readonly current: string
  readonly ratio: string | undefined
  readonly onChanged: () => void
  readonly onClose: () => void
  readonly onChoose: (key: string) => void
}) {
  const [selected, setSelected] = useState(current)
  const [problem, setProblem] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(opened)

  // La fenêtre reste montée, seule sa visibilité change : sans cette remise à
  // zéro, l’état initial ne se rejouait jamais et le sélecteur ouvert depuis un
  // second champ proposait l’image choisie pour le premier.
  if (shown !== opened) {
    setShown(opened)

    if (opened) {
      setSelected(current)
      setProblem('')
      setSearch('')
      setFilter('all')
    }
  }

  const media = payload.media
  const unused = media.filter((entry) => entry.usage === 0)
  const asked = search.trim().toLowerCase()
  const shownMedia = (filter === 'unused' ? unused : media).filter(
    (entry) => asked === '' || alt(entry).toLowerCase().includes(asked),
  )

  const entry = media.find((item) => item.key === selected)
  const places = entry === undefined ? [] : placesOf(payload, entry.key)

  return (
    <Modal
      opened={opened}
      title="Bibliothèque d’images"
      width="var(--panel-width-modal)"
      note={
        <Text tone="muted" data-size="eyebrow">
          Toutes vos images, quelle que soit la page.
        </Text>
      }
      onClose={onClose}
      foot={
        <>
          <Mono className="basalte-row__note">
            {shownMedia.length} affichée{shownMedia.length > 1 ? 's' : ''} ·{' '}
            {media.length} en tout
          </Mono>
          <Spacer />
          <Button onClick={onClose}>Annuler</Button>
          <Button
            tone="ink"
            disabled={selected === ''}
            onClick={() => onChoose(selected)}
          >
            Utiliser cette image
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

        <Group gap="md">
          <Segmented
            label="Ce que la grille montre"
            value={filter}
            items={[
              { value: 'all' as const, label: `Toutes · ${media.length}` },
              {
                value: 'unused' as const,
                label: `Jamais utilisées · ${unused.length}`,
              },
            ]}
            onChange={setFilter}
          />
          <TextField
            placeholder="Rechercher une image"
            value={search}
            aria-label="Rechercher une image"
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Spacer />
          <UploadButton
            label="Importer depuis mon ordinateur"
            onDone={(added) => {
              setSelected(added.key)
              onChanged()
            }}
            onError={setProblem}
          />
        </Group>

        <div className="basalte-picker-body">
          <MediaGrid
            media={shownMedia}
            selected={selected}
            columns={4}
            flag={(item) => (item.usage === 0 ? 'jamais utilisée' : undefined)}
            empty={
              <Empty
                title="Aucune image"
                note={
                  filter === 'unused'
                    ? 'Toutes vos images servent quelque part.'
                    : 'Importez-en une depuis votre ordinateur.'
                }
              />
            }
            onSelect={setSelected}
          />

          <Stack gap="lg" className="basalte-picker-aside">
            {entry === undefined ? (
              <Text tone="meta" data-size="eyebrow">
                Choisissez une image pour voir ce qu’elle porte.
              </Text>
            ) : (
              <>
                <Eyebrow>
                  {entry.width}×{entry.height} · {entry.format}
                </Eyebrow>
                <Stack gap="xs">
                  <span className="basalte-label">Texte alternatif</span>
                  <Text tone="muted" data-size="eyebrow">
                    {alt(entry) === ''
                      ? 'Rien n’est écrit. Il se règle dans l’onglet Médias.'
                      : alt(entry)}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <span className="basalte-label">Utilisée dans</span>
                  {places.length === 0 ? (
                    <Text tone="meta" data-size="eyebrow">
                      Nulle part pour l’instant.
                    </Text>
                  ) : (
                    places.map((place) => (
                      <Text key={place.entry} tone="muted" data-size="eyebrow">
                        {place.label}
                      </Text>
                    ))
                  )}
                </Stack>
              </>
            )}
            <Spacer />
            <Text tone="meta" data-size="eyebrow">
              Le texte alternatif et le point focal se règlent dans l’onglet
              Médias. Aucun recadrage : le site cadre autour du point focal
              {ratio === undefined ? '' : `, y compris en ${ratio}`}.
            </Text>
          </Stack>
        </div>
      </Stack>
    </Modal>
  )
}

/** Le texte alternatif dans la langue par défaut, quelle qu’elle soit. */
function alt(entry: MediaSummary): string {
  return Object.values(entry.alt).find((written) => written !== '') ?? ''
}
