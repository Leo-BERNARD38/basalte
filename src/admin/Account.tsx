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

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function Account({
  support,
  onSignedOut,
}: {
  readonly support: string
  readonly onSignedOut: () => void
}) {
  const [session, setSession] = useState<SessionInfo | undefined>(undefined)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const answer = await readSession()

    if (answer.ok) setSession(answer.data)
    else if (answer.signedOut) onSignedOut()
  }

  useEffect(() => {
    void refresh()
  }, [])

  const change = async () => {
    setBusy(true)

    const answer = await changePassword(current, next)

    setBusy(false)
    setCurrent('')
    setNext('')

    if (!answer.ok) {
      setProblem(answer.message)
      setNotice('')
      return
    }

    setProblem('')
    setNotice(
      answer.data.closed > 0
        ? `Mot de passe changé. ${answer.data.closed} autre(s) session(s) ont été fermées.`
        : 'Mot de passe changé.',
    )
  }

  const forget = async () => {
    setBusy(true)

    const answer = await forgetDevices()

    setBusy(false)

    if (answer.ok) onSignedOut()
    else setProblem(answer.message)
  }

  return (
    <Stack gap="md" maw={720}>
      {notice !== '' && <Alert color="green">{notice}</Alert>}

      {problem !== '' && <Alert color="red">{problem}</Alert>}

      <Paper p="md">
        <Stack gap="md">
          <Title order={4}>Mot de passe</Title>
          <Text size="sm" c="dimmed">
            Douze caractères au minimum. Le changer ferme les sessions ouvertes
            ailleurs.
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
            value={next}
            onChange={(event) => setNext(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              loading={busy}
              disabled={current === '' || next === ''}
              onClick={change}
            >
              Changer le mot de passe
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md">
        <Stack gap="md">
          <Title order={4}>Appareils reconnus</Title>
          {session === undefined || session.devices.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun appareil retenu : le code est demandé à chaque connexion.
            </Text>
          ) : (
            <Table>
              <Table.Tbody>
                {session.devices.map((device) => (
                  <Table.Tr key={`${device.createdAt}-${device.ip}`}>
                    <Table.Td>{device.agent || 'Navigateur inconnu'}</Table.Td>
                    <Table.Td>{device.ip || 'adresse inconnue'}</Table.Td>
                    <Table.Td>
                      jusqu’au {MOMENT.format(device.expiresAt)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Group justify="flex-end">
            <Button variant="default" loading={busy} onClick={forget}>
              Oublier tous les appareils
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md">
        <Stack gap="md">
          <Title order={4}>Connexions récentes</Title>
          {session === undefined || session.journal.length === 0 ? (
            <Text size="sm" c="dimmed">
              Rien à afficher pour l’instant.
            </Text>
          ) : (
            <Table>
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
        <Paper p="md">
          <Stack gap="xs">
            <Title order={4}>Besoin d’aide</Title>
            <Text size="sm" c="dimmed">
              Une page cassée, une section à ajouter, une question : écrivez à{' '}
              <Anchor href={`mailto:${support}`}>{support}</Anchor>.
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
