// L’écran « Messages » : ce que le formulaire de contact a reçu.
//
// C’est le filet du client. Un message est là même quand rien n’est parti, et
// l’écran le dit plutôt que de le taire — sans quoi le client croirait sa boîte
// à jour. Il ne le signale que d’une notification réellement manquée : sur un
// site qui ne prévient personne, l’écrire sur chaque message serait une alarme
// qui ne veut rien dire.
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
} from '@mantine/core'
import { useEffect, useState } from 'react'

import type { LeadSummary } from '../server/panel.js'
import { deleteLead, markLeadRead, readLeads } from './api.js'
import { Waiting } from './Waiting.js'

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function Messages({
  notified,
  onChanged,
  onSignedOut,
}: {
  readonly notified: boolean
  readonly onChanged: () => void
  readonly onSignedOut: (message: string) => void
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

    if (answer.signedOut) onSignedOut(answer.message)
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
    <Stack gap="md" maw="var(--panel-measure-page)">
      {problem !== '' && (
        <Alert color="red" title="Les messages n’ont pas pu être lus">
          {problem}
        </Alert>
      )}

      {leads === undefined && problem === '' && (
        <Waiting what="Lecture des messages…" />
      )}

      {leads !== undefined && leads.length === 0 && (
        <Text size="sm" c="dimmed">
          {notified
            ? 'Aucun message pour l’instant. Vous serez prévenu dès qu’il en arrive un, et vous le retrouverez ici.'
            : 'Aucun message pour l’instant. Rien ne vous préviendra : c’est ici qu’ils arrivent.'}
        </Text>
      )}

      {leads !== undefined && leads.length > 0 && (
        <Accordion onChange={(id) => void opened(id ?? '')}>
          {leads.map((lead) => (
            <Accordion.Item key={lead.id} value={String(lead.id)}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="sm">
                  <Text fw={lead.readAt === undefined ? 700 : 400}>
                    {lead.name}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    {lead.delivery === 'failed' && (
                      <Badge color="orange">non transmis</Badge>
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
