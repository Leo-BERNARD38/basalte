// L’écran « Compte » : le mot de passe, les appareils reconnus et le journal
// des connexions. Ce dernier vaut plus qu’un verrouillage — il montre au
// client ce qui se passe sur son site.
//
// C’est aussi là qu’il apprend à qui écrire. Un client qui ne sait pas qui
// appeler appelle quand même, et il appelle plus tard qu’il n’aurait dû : la
// phrase est ici parce que c’est l’écran où l’on vient quand quelque chose ne
// va pas.

import {
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'

import {
  changePassword,
  forgetDevices,
  readSession,
  type SessionInfo,
} from './api.js'
import { Waiting } from './Waiting.js'

/** La borne du serveur, redite ici pour qu’un refus n’ait pas à faire l’aller. */
const MINIMUM = 12

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function Account({
  support,
  onSignedOut,
}: {
  readonly support: string
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
    <Stack gap="md" maw="var(--panel-measure-page)">
      {notice !== '' && (
        <Alert
          color="green"
          title="C’est fait"
          withCloseButton
          onClose={() => setNotice('')}
        >
          {notice}
        </Alert>
      )}

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

      <Paper p="lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void change()
          }}
        >
          <Stack gap="md">
            <Title order={3}>Mot de passe</Title>
            <Text size="sm" c="dimmed">
              {MINIMUM} caractères au minimum. Le changer ferme les sessions
              ouvertes ailleurs.
            </Text>
            <PasswordInput
              label="Mot de passe actuel"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.currentTarget.value)}
            />
            <PasswordInput
              label="Nouveau mot de passe"
              autoComplete="new-password"
              error={tooShort ? `${MINIMUM} caractères au minimum.` : undefined}
              value={next}
              onChange={(event) => setNext(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={changing} disabled={!ready}>
                Changer le mot de passe
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Paper p="lg">
        <Stack gap="md">
          <Title order={3}>Appareils reconnus</Title>
          {session === undefined ? (
            <Waiting what="Lecture de la session…" />
          ) : session.devices.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun appareil retenu : le code est demandé à chaque connexion.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Navigateur</Table.Th>
                  <Table.Th>Adresse</Table.Th>
                  <Table.Th>Reconnu jusqu’au</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {session.devices.map((device) => (
                  <Table.Tr key={`${device.createdAt}-${device.ip}`}>
                    <Table.Td>
                      <Text size="sm" lineClamp={1} title={device.agent}>
                        {device.agent || 'Navigateur inconnu'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{device.ip || 'adresse inconnue'}</Table.Td>
                    <Table.Td>{MOMENT.format(device.expiresAt)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              loading={forgetting}
              onClick={() => setAsked(true)}
            >
              Oublier tous les appareils
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="lg">
        <Stack gap="md">
          <Title order={3}>Connexions récentes</Title>
          {session === undefined ? (
            <Waiting what="Lecture du journal…" />
          ) : session.journal.length === 0 ? (
            <Text size="sm" c="dimmed">
              Rien à afficher pour l’instant.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Quand</Table.Th>
                  <Table.Th>Quoi</Table.Th>
                  <Table.Th>Adresse</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {session.journal.map((entry) => (
                  <Table.Tr key={`${entry.at}-${entry.label}`}>
                    <Table.Td>{MOMENT.format(entry.at)}</Table.Td>
                    <Table.Td>{entry.label}</Table.Td>
                    <Table.Td>{entry.ip || 'adresse inconnue'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>

      {support !== '' && (
        <Paper p="lg">
          <Stack gap="xs">
            <Title order={3}>Besoin d’aide</Title>
            <Text size="sm" c="dimmed">
              Une page cassée, une section à ajouter, une question : écrivez à{' '}
              <Anchor href={`mailto:${support}`}>{support}</Anchor>.
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Oublier les appareils déconnecte : c’est la seule action de cet écran
          dont on ne revient pas, et elle se demandait sans rien dire. */}
      <Modal
        opened={asked}
        onClose={() => setAsked(false)}
        title="Oublier tous les appareils"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Le code par email sera redemandé à chaque connexion, sur chaque
            appareil. Vous serez déconnecté d’ici.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAsked(false)}>
              Annuler
            </Button>
            <Button color="red" onClick={() => void forget()}>
              Oublier
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
