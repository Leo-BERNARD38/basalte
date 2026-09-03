// L’écran « Compte » : l’apparence du panel, le mot de passe, les appareils
// reconnus et le journal des connexions. Ce dernier vaut plus qu’un
// verrouillage — il montre au client ce qui se passe sur son site, et il
// tient donc toute la hauteur de l’écran, à côté des réglages qu’on ne touche
// presque jamais.
//
// L’apparence est le seul réglage qui ne parte pas au serveur : le mode et
// la couleur sont ceux de cet appareil, comme la taille d’une police (D208).
//
// C’est aussi là qu’il apprend à qui écrire. Un client qui ne sait pas qui
// appeler appelle quand même, et il appelle plus tard qu’il n’aurait dû : la
// phrase est ici parce que c’est l’écran où l’on vient quand quelque chose ne
// va pas.

import { useEffect, useState } from 'react'

import {
  changePassword,
  forgetDevices,
  readSession,
  type SessionInfo,
} from './api.js'
import { PREFERENCES, PRESETS, seedOf, type Appearance } from './appearance.js'
import { Waiting } from './Waiting.js'
import { Button, IconButton } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { Close } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Banner, Card } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'
import { Segmented } from './ui/Toggle.js'

/** La borne du serveur, redite ici pour qu’un refus n’ait pas à faire l’aller. */
const MINIMUM = 12

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** Les colonnes des deux tableaux : chaque rangée est sa propre grille. */
// Chaque rangée est sa propre grille : les colonnes se déclarent donc en
// largeurs fixes, faute de quoi l’en-tête se mesure sur ses libellés et les
// rangées sur leurs données, et les deux ne tombent plus l’une sous l’autre.
// Ces deux largeurs tiennent un horodatage entier à la taille du texte.
const DEVICE_COLUMNS = 'minmax(0, 1fr) 148px'
const JOURNAL_COLUMNS = '148px minmax(0, 1fr) 116px'

export function Account({
  appearance,
  siteSeed,
  onAppearance,
  onSignedOut,
}: {
  readonly appearance: Appearance
  /** La graine du site : ce à quoi « Couleur du site » revient. */
  readonly siteSeed: string | undefined
  readonly onAppearance: (appearance: Appearance) => void
  readonly onSignedOut: (message: string) => void
}) {
  const [session, setSession] = useState<SessionInfo | undefined>(undefined)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [changing, setChanging] = useState(false)
  const [forgetting, setForgetting] = useState(false)
  const [asked, setAsked] = useState(false)

  const refresh = async () => {
    const answer = await readSession()

    if (answer.ok) setSession(answer.data)
    else if (answer.signedOut) onSignedOut(answer.message)
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Les champs ne se vident qu’une fois le mot de passe accepté : les effacer
  // d’abord faisait retaper les deux sur un refus qui ne portait que sur l’un.
  const change = async () => {
    setChanging(true)

    const answer = await changePassword(current, next)

    setChanging(false)

    if (!answer.ok) {
      setProblem(answer.message)
      setNotice('')

      return
    }

    setCurrent('')
    setNext('')
    setProblem('')
    setNotice(
      answer.data.closed > 0
        ? `Mot de passe changé. ${answer.data.closed} autre(s) session(s) ont été fermées.`
        : 'Mot de passe changé.',
    )
  }

  const forget = async () => {
    setAsked(false)
    setForgetting(true)

    const answer = await forgetDevices()

    setForgetting(false)

    if (answer.ok) {
      onSignedOut(
        'Les appareils reconnus ont été oubliés. Le code vous sera redemandé.',
      )

      return
    }

    setProblem(answer.message)
  }

  // La borne se vérifie ici aussi : la connaître et laisser quand même partir
  // une demande vouée au refus fait payer un aller-retour pour rien.
  const tooShort = next !== '' && next.length < MINIMUM
  const ready = current !== '' && next.length >= MINIMUM

  return (
    <Stack gap="xl">
      {notice !== '' && (
        <Banner>
          <Group gap="md">
            <Stack gap="xs">
              <strong>C’est fait</strong>
              <Text tone="muted">{notice}</Text>
            </Stack>
            <Spacer />
            <IconButton label="Fermer" onClick={() => setNotice('')}>
              <Close />
            </IconButton>
          </Group>
        </Banner>
      )}

      {problem !== '' && (
        <Banner tone="refused">
          <Group gap="md">
            <Stack gap="xs">
              <strong>La demande a été refusée</strong>
              <Text tone="muted">{problem}</Text>
            </Stack>
            <Spacer />
            <IconButton label="Fermer" onClick={() => setProblem('')}>
              <Close />
            </IconButton>
          </Group>
        </Banner>
      )}

      <div className="basalte-account">
        <Stack gap="xl">
          <Card>
            <Stack gap="lg">
              <Stack gap="xs">
                <Title role="title-md">Apparence</Title>
                <Text tone="meta" role="label-md">
                  Réglée pour ce navigateur seulement.
                </Text>
              </Stack>

              <Stack gap="xs">
                <span className="basalte-label">Mode</span>
                <Segmented
                  block
                  label="Le mode du panel"
                  value={appearance.mode}
                  items={PREFERENCES}
                  onChange={(mode) => onAppearance({ ...appearance, mode })}
                />
              </Stack>

              <Stack gap="xs">
                <span className="basalte-label">Couleur</span>
                <Swatches
                  appearance={appearance}
                  siteSeed={siteSeed}
                  onAppearance={onAppearance}
                />
              </Stack>
            </Stack>
          </Card>

          <Card>
            {/* Aucun bouton du panel n’est de type « submit » : la touche
                entrée vaut le bouton, et ne relance pas ce qui est parti. */}
            <form
              onSubmit={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return

                event.preventDefault()

                if (ready && !changing) void change()
              }}
            >
              <Stack gap="lg">
                <Title role="title-md">Mot de passe</Title>

                <Field label="Mot de passe actuel">
                  {(bound) => (
                    <TextField
                      {...bound}
                      type="password"
                      autoComplete="current-password"
                      value={current}
                      onChange={(event) =>
                        setCurrent(event.currentTarget.value)
                      }
                    />
                  )}
                </Field>

                <Field
                  label="Nouveau mot de passe"
                  hint={`${MINIMUM} caractères au minimum.`}
                  error={
                    tooShort ? `${MINIMUM} caractères au minimum.` : undefined
                  }
                >
                  {(bound) => (
                    <TextField
                      {...bound}
                      type="password"
                      autoComplete="new-password"
                      value={next}
                      onChange={(event) => setNext(event.currentTarget.value)}
                    />
                  )}
                </Field>

                <Group gap="md">
                  <Spacer />
                  <Button
                    variant="filled"
                    busy={changing}
                    disabled={!ready}
                    onClick={() => void change()}
                  >
                    Changer le mot de passe
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>

          <Card>
            <Stack gap="lg">
              <Title role="title-md">Appareils reconnus</Title>

              {session === undefined ? (
                <Waiting what="Lecture de la session…" />
              ) : session.devices.length === 0 ? (
                <Text tone="meta" role="label-md">
                  Aucun appareil retenu : le code est demandé à chaque
                  connexion.
                </Text>
              ) : (
                <div className="basalte-table">
                  <div
                    className="basalte-table__row"
                    data-head="true"
                    style={{ gridTemplateColumns: DEVICE_COLUMNS }}
                  >
                    <Eyebrow>Navigateur</Eyebrow>
                    <Eyebrow>Reconnu jusqu’au</Eyebrow>
                  </div>

                  {session.devices.map((device) => (
                    <div
                      key={`${device.createdAt}-${device.ip}`}
                      className="basalte-table__row"
                      style={{ gridTemplateColumns: DEVICE_COLUMNS }}
                    >
                      <Stack gap="hair">
                        <Text
                          className="basalte-row__text"
                          title={device.agent}
                        >
                          {device.agent || 'Navigateur inconnu'}
                        </Text>
                        <Eyebrow>{device.ip || 'adresse inconnue'}</Eyebrow>
                      </Stack>
                      <Mono>{MOMENT.format(device.expiresAt)}</Mono>
                    </div>
                  ))}
                </div>
              )}

              <Group gap="md">
                <Spacer />
                <Button
                  variant="text"
                  busy={forgetting}
                  onClick={() => setAsked(true)}
                >
                  Oublier tous les appareils
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>

        <Card>
          <Stack gap="lg">
            <Title role="title-md">Journal de connexion</Title>

            {session === undefined ? (
              <Waiting what="Lecture du journal…" />
            ) : session.journal.length === 0 ? (
              <Text tone="meta" role="label-md">
                Rien à afficher pour l’instant.
              </Text>
            ) : (
              <div className="basalte-table">
                <div
                  className="basalte-table__row"
                  data-head="true"
                  style={{ gridTemplateColumns: JOURNAL_COLUMNS }}
                >
                  <Eyebrow>Quand</Eyebrow>
                  <Eyebrow>Quoi</Eyebrow>
                  <Eyebrow>Adresse</Eyebrow>
                </div>

                {session.journal.map((entry) => (
                  <div
                    key={`${entry.at}-${entry.label}`}
                    className="basalte-table__row"
                    style={{ gridTemplateColumns: JOURNAL_COLUMNS }}
                  >
                    <Mono>{MOMENT.format(entry.at)}</Mono>
                    <Text className="basalte-row__text">{entry.label}</Text>
                    {/* La chasse fixe aligne une colonne d’adresses ; son
                        absence est une phrase, et se lit comme telle. */}
                    {entry.ip ? (
                      <Mono>{entry.ip}</Mono>
                    ) : (
                      <Text tone="meta" role="label-md">
                        adresse inconnue
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Stack>
        </Card>
      </div>

      {/* Oublier les appareils déconnecte : c’est la seule action de cet écran
          dont on ne revient pas, et elle se demandait sans rien dire. */}
      <Modal
        opened={asked}
        title="Oublier tous les appareils"
        onClose={() => setAsked(false)}
        foot={
          <>
            <Spacer />
            <Button variant="text" onClick={() => setAsked(false)}>
              Annuler
            </Button>
            <Button variant="text" tone="error" onClick={() => void forget()}>
              Oublier
            </Button>
          </>
        }
      >
        <Text tone="muted">
          Le code par email sera redemandé à chaque connexion, sur chaque
          appareil. Vous serez déconnecté d’ici.
        </Text>
      </Modal>
    </Stack>
  )
}

/**
 * Les graines : celle du site d’abord, puis les propositions, puis une
 * couleur libre. La choisie porte un anneau, jamais une coche — une coche
 * blanche se perd sur une graine claire, un anneau se lit sur toutes.
 */
function Swatches({
  appearance,
  siteSeed,
  onAppearance,
}: {
  readonly appearance: Appearance
  readonly siteSeed: string | undefined
  readonly onAppearance: (appearance: Appearance) => void
}) {
  const chosen = appearance.seed
  const site = seedOf({ mode: appearance.mode }, siteSeed)
  const known = new Set([site, ...PRESETS.map((preset) => preset.seed)])
  const custom = chosen !== undefined && !known.has(chosen)

  const choose = (seed: string | undefined) =>
    onAppearance(
      seed === undefined
        ? { mode: appearance.mode }
        : { mode: appearance.mode, seed },
    )

  const swatch = (
    seed: string,
    label: string,
    on: boolean,
    onClick: () => void,
  ) => (
    <button
      key={label}
      type="button"
      className="basalte-swatch"
      style={{ '--swatch': seed } as React.CSSProperties}
      data-on={on ? 'true' : undefined}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
    />
  )

  return (
    <div className="basalte-swatches">
      {swatch(
        'var(--panel-color-primary)',
        'Couleur du site',
        chosen === undefined,
        () => choose(undefined),
      )}
      {PRESETS.filter((preset) => preset.seed !== site).map((preset) =>
        swatch(preset.seed, preset.label, chosen === preset.seed, () =>
          choose(preset.seed),
        ),
      )}
      <label
        className="basalte-swatch basalte-swatch--custom"
        data-on={custom ? 'true' : undefined}
        title="Une autre couleur"
      >
        <input
          type="color"
          aria-label="Une autre couleur"
          value={chosen ?? site}
          onChange={(event) => choose(event.currentTarget.value.toLowerCase())}
        />
      </label>
    </div>
  )
}
