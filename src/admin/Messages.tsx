// L’écran « Messages » : ce que le formulaire de contact a reçu.
//
// C’est le filet du client. Un message est là même quand l’email n’est pas
// parti, et l’écran le dit plutôt que de le taire — sans quoi le client
// croirait sa boîte à jour.
//
// Un message ouvert est marqué lu : le client ne coche rien, la pastille
// descend d’elle-même.

import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'

import type { LeadSummary } from '../server/panel.js'
import { deleteLead, markLeadRead, readLeads } from './api.js'

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function Messages({
  retention,
  onChanged,
  onSignedOut,
}: {
  readonly retention: number
  readonly onChanged: () => void
  readonly onSignedOut: () => void
}) {
  const [leads, setLeads] = useState<readonly LeadSummary[] | undefined>(
    undefined,
  )
  const [problem, setProblem] = useState('')
  const [asked, setAsked] = useState<LeadSummary | undefined>(undefined)

  const refresh = async () => {
    const answer = await readLeads()

    if (answer.ok) {
      setLeads(answer.data.leads)
      onChanged()
      return
    }

    if (answer.signedOut) onSignedOut()
    else setProblem(answer.message)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const opened = async (id: string) => {
    const lead = leads?.find((entry) => String(entry.id) === id)

    if (lead === undefined || lead.readAt !== undefined) return

    await markLeadRead(lead.id)
    await refresh()
  }

  const remove = async (lead: LeadSummary) => {
    setAsked(undefined)

    const answer = await deleteLead(lead.id)

    if (answer.ok) await refresh()
    else setProblem(answer.message)
  }

  return (
    <Stack gap="md" maw={860}>
      <Group justify="space-between" align="baseline">
        <Title order={3}>Messages</Title>
        <Text size="sm" c="dimmed">
          Conservés {retention} mois, puis effacés.
        </Text>
      </Group>

      {problem !== '' && (
        <Alert color="red" variant="light">
          {problem}
        </Alert>
      )}

      {leads !== undefined && leads.length === 0 && (
        <Text size="sm" c="dimmed">
          Aucun message pour l’instant. Ils arriveront ici en même temps que
          dans votre boîte email.
        </Text>
      )}

      {leads !== undefined && leads.length > 0 && (
        <Accordion variant="separated" onChange={(id) => void opened(id ?? '')}>
          {leads.map((lead) => (
            <Accordion.Item key={lead.id} value={String(lead.id)}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="sm">
                  <Text fw={lead.readAt === undefined ? 700 : 400}>
                    {lead.name}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    {lead.delivery === 'failed' && (
                      <Badge color="orange" variant="light">
                        non transmis par email
                      </Badge>
                    )}
                    <Text size="sm" c="dimmed">
                      {MOMENT.format(lead.at)}
                    </Text>
                  </Group>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap="sm">
                  <Text size="sm" c="dimmed">
                    Reçu depuis {lead.page}
                  </Text>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{lead.message}</Text>
                  <Group justify="space-between">
                    <Anchor href={`mailto:${lead.email}`} size="sm">
                      Répondre à {lead.email}
                    </Anchor>
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => setAsked(lead)}
                    >
                      Supprimer
                    </Button>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <Modal
        opened={asked !== undefined}
        onClose={() => setAsked(undefined)}
        title="Supprimer ce message"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Le message de {asked?.name} sera effacé définitivement. Il n’est
            gardé nulle part ailleurs.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAsked(undefined)}>
              Annuler
            </Button>
            <Button
              color="red"
              onClick={() => asked !== undefined && void remove(asked)}
            >
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
