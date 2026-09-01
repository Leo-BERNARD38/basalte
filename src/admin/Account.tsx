// L’écran « Compte » : le mot de passe, les appareils reconnus et le journal
// des connexions. Ce dernier vaut plus qu’un verrouillage — il montre au
// client ce qui se passe sur son site, et il tient donc toute la hauteur de
// l’écran, à côté des deux réglages qu’on ne touche presque jamais.
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
import { Waiting } from './Waiting.js'
import { Button, IconButton } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { Close } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Banner, Card } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'

/** La borne du serveur, redite ici pour qu’un refus n’ait pas à faire l’aller. */
const MINIMUM = 12

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** Les colonnes des deux tableaux : chaque rangée est sa propre grille. */
const DEVICE_COLUMNS = 'minmax(0, 1fr) 130px'
const JOURNAL_COLUMNS = '130px minmax(0, 1fr) 120px'

export function Account({
  onSignedOut,
}: {
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
                <Title rank="card">Mot de passe</Title>

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
                    tone="ink"
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
              <Title rank="card">Appareils reconnus</Title>

              {session === undefined ? (
                <Waiting what="Lecture de la session…" />
              ) : session.devices.length === 0 ? (
                <Text tone="meta" size="small">
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
                <Button busy={forgetting} onClick={() => setAsked(true)}>
                  Oublier tous les appareils
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>

        <Card>
          <Stack gap="lg">
            <Title rank="card">Journal de connexion</Title>

            {session === undefined ? (
              <Waiting what="Lecture du journal…" />
            ) : session.journal.length === 0 ? (
              <Text tone="meta" size="small">
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
                    <Mono>{entry.ip || 'adresse inconnue'}</Mono>
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
            <Button onClick={() => setAsked(false)}>Annuler</Button>
            <Button tone="danger" onClick={() => void forget()}>
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
