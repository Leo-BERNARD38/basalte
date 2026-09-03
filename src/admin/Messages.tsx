// L’écran « Messages » : ce que le formulaire de contact a reçu.
//
// C’est le filet du client. Un message est là même quand rien n’est parti, et
// l’écran le dit plutôt que de le taire — sans quoi le client croirait sa boîte
// à jour. Il ne le signale que d’une notification réellement manquée : sur un
// site qui ne prévient personne, l’écrire sur chaque message serait une alarme
// qui ne veut rien dire.
//
// La liste et le message vivent côte à côte : une boîte se parcourt du regard,
// et l’un après l’autre demandait de replier ce qu’on venait de lire.
//
// Un message ouvert est marqué lu : le client ne coche rien, la pastille
// descend d’elle-même.

import { useEffect, useState } from 'react'

import type { LeadSummary } from '../server/panel.js'
import { deleteLead, markLeadRead, readLeads } from './api.js'
import { Waiting } from './Waiting.js'
import { Badge } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Row, RowGlyph, RowStack, RowText } from './ui/Row.js'
import { Banner, Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'

const MOMENT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

const HOUR = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })

const DAY = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
})

/**
 * Ce qu’on lit d’un message sans l’ouvrir. Le formulaire ne demande pas de
 * sujet : c’est le texte entier, mis sur une ligne, et la ligne se coupe où
 * la colonne s’arrête. Prendre la première ligne seule ne dirait « Bonjour, »
 * de tout message qui commence par une salutation.
 */
function previewOf(lead: LeadSummary): string {
  const flat = lead.message.replace(/\s+/g, ' ').trim()

  return flat === '' ? 'Message sans texte' : flat
}

/** L’heure du jour, la date au-delà : une colonne de « 14:32 » ne dit rien. */
function stampOf(at: number, now: number): string {
  return new Date(at).toDateString() === new Date(now).toDateString()
    ? HOUR.format(at)
    : DAY.format(at)
}

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
  const [chosen, setChosen] = useState<number | undefined>(undefined)
  const [asked, setAsked] = useState<LeadSummary | undefined>(undefined)
  const now = Date.now()

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

  const open = async (lead: LeadSummary) => {
    setChosen(lead.id)

    if (lead.readAt !== undefined) return

    await markLeadRead(lead.id)
    await refresh()
  }

  const remove = async (lead: LeadSummary) => {
    setAsked(undefined)

    if (lead.id === chosen) setChosen(undefined)

    const answer = await deleteLead(lead.id)

    if (answer.ok) await refresh()
    else setProblem(answer.message)
  }

  const current = leads?.find((lead) => lead.id === chosen)

  return (
    <Stack gap="xl">
      {problem !== '' && (
        <Banner tone="refused">
          <Stack gap="xs">
            <strong>Les messages n’ont pas pu être lus</strong>
            <Text tone="muted">{problem}</Text>
          </Stack>
        </Banner>
      )}

      {leads === undefined && problem === '' && (
        <Waiting what="Lecture des messages…" />
      )}

      {leads !== undefined && leads.length === 0 && (
        <Empty
          title="Aucun message pour l’instant"
          note={
            notified
              ? 'Vous serez prévenu dès qu’il en arrive un, et vous le retrouverez ici.'
              : 'Rien ne vous préviendra : c’est ici qu’ils arrivent.'
          }
        />
      )}

      {leads !== undefined && leads.length > 0 && (
        <div className="basalte-messages">
          <Stack gap="hair">
            {leads.map((lead) => (
              <Row
                key={lead.id}
                current={lead.id === chosen}
                onClick={() => void open(lead)}
              >
                <RowGlyph>
                  {lead.readAt === undefined && (
                    <span className="basalte-badge__dot" />
                  )}
                </RowGlyph>
                <RowStack>
                  <RowText>{lead.name}</RowText>
                  <RowText>
                    <Text tone="meta" role="label-md">
                      {previewOf(lead)}
                    </Text>
                  </RowText>
                </RowStack>
                <Mono className="basalte-row__note">
                  {stampOf(lead.at, now)}
                </Mono>
              </Row>
            ))}
          </Stack>

          {current === undefined ? (
            <Empty
              title="Aucun message ouvert"
              note="Choisissez un message dans la liste : il s’ouvre ici."
            />
          ) : (
            <Card>
              <Stack gap="xl">
                <Stack gap="xs">
                  <Title role="title-md">{current.name}</Title>
                  <Text tone="muted">{current.email}</Text>
                  <Eyebrow>
                    {MOMENT.format(current.at)} · reçu depuis {current.page}
                  </Eyebrow>
                </Stack>

                {current.delivery === 'failed' && (
                  <Badge tone="refused">
                    La notification n’a pas été transmise
                  </Badge>
                )}

                <Card tone="raised" className="basalte-messages__body">
                  {current.message}
                </Card>

                <Group gap="md">
                  <a className="basalte-link" href={`mailto:${current.email}`}>
                    Répondre par email
                  </a>
                  <Spacer />
                  <Button
                    variant="text"
                    tone="error"
                    size="sm"
                    onClick={() => setAsked(current)}
                  >
                    Supprimer
                  </Button>
                </Group>
              </Stack>
            </Card>
          )}
        </div>
      )}

      <Modal
        opened={asked !== undefined}
        title="Supprimer ce message"
        onClose={() => setAsked(undefined)}
        foot={
          <>
            <Spacer />
            <Button onClick={() => setAsked(undefined)}>Annuler</Button>
            <Button
              variant="text"
              tone="error"
              onClick={() => asked !== undefined && void remove(asked)}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <Text tone="muted">
          Le message de {asked?.name} sera effacé définitivement. Il n’est gardé
          nulle part ailleurs.
        </Text>
      </Modal>
    </Stack>
  )
}
