// Le cadre du panel : la navigation, la langue affichée, et l’en-tête d’écran
// — seul endroit où agir sur l’état du site.
//
// Trois informations y sont lisibles en permanence : reste-t-il quelque chose
// à enregistrer, quand la dernière modification a-t-elle été enregistrée, et
// quelque chose est-il cassé. Elles vivent sous le titre, à côté des deux
// boutons, pour qu’un seul regard suffise.
//
// Une quatrième les accompagne, et c’est une phrase : deux boutons côte à côte
// n’expliquent pas d’eux-mêmes que l’un garde et que l’autre montre. C’est la
// question que le client pose le plus souvent, et elle se règle ici plutôt que
// dans un écran d’aide qui n’existera pas (D63).

import { Alert, Badge, Button, Group, Select, Tabs, Text } from '@mantine/core'
import type { ReactNode } from 'react'

import type { PublishState } from '../publish/publish.js'
import type { PanelPayload } from '../server/panel.js'
import type { Capabilities } from '../site/capabilities.js'
import { signOut } from './api.js'

export type Screen =
  'edit' | 'journal' | 'media' | 'messages' | 'stats' | 'account'

// L’ordre suit la fréquence d’usage. Arriver à dix signifierait que deux
// d’entre eux auraient dû fusionner (`panel.md`) ; « Actualités » vient en
// second parce qu’un site qui tient un journal y revient chaque jour, quand il
// n’édite ses pages que de loin en loin.
export const SCREENS: readonly {
  readonly value: Screen
  readonly label: string
}[] = [
  { value: 'edit', label: 'Édition' },
  { value: 'journal', label: 'Actualités' },
  { value: 'media', label: 'Médias' },
  { value: 'messages', label: 'Messages' },
  { value: 'stats', label: 'Statistiques' },
  { value: 'account', label: 'Compte' },
]

/**
 * Les écrans que ce site-là déclare. Deux peuvent manquer : la mesure
 * d’audience, et le journal. Un onglet qui mène à un écran vide vaut moins que
 * pas d’onglet du tout — et un client sans journal ignore que la fonction
 * existe.
 */
export function screensFor(
  capabilities: Capabilities,
  journal: boolean,
): typeof SCREENS {
  return SCREENS.filter((screen) => {
    if (screen.value === 'stats') return capabilities.analytics
    if (screen.value === 'journal') return journal

    return true
  })
}

const MOMENT = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })

const ONLINE = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function Shell({
  payload,
  screen,
  heading,
  onScreen,
  language,
  onLanguage,
  dirty,
  busy,
  savedAt,
  problems,
  publication,
  onSave,
  onPublish,
  onSignedOut,
  children,
}: {
  readonly payload: PanelPayload
  readonly screen: Screen
  readonly heading: string
  readonly onScreen: (screen: Screen) => void
  readonly language: string
  readonly onLanguage: (language: string) => void
  readonly dirty: boolean
  readonly busy: boolean
  readonly savedAt: number | undefined
  readonly problems: readonly string[]
  readonly publication: PublishState
  readonly onSave: () => void
  readonly onPublish: () => void
  readonly onSignedOut: () => void
  readonly children: ReactNode
}) {
  const several = payload.site.languages.length > 1
  const busyOnline = publication.running || publication.queued
  const last = publication.last

  return (
    <div className="basalte-shell">
      <header className="basalte-topbar">
        <span className="basalte-brand">
          <span className="basalte-brand__mark" />
          {payload.site.name}
        </span>

        <Tabs
          value={screen}
          onChange={(value) => onScreen((value ?? 'edit') as Screen)}
        >
          <Tabs.List>
            {screensFor(
              payload.site.capabilities,
              payload.journal !== undefined,
            ).map((entry) => (
              <Tabs.Tab
                key={entry.value}
                value={entry.value}
                rightSection={
                  entry.value === 'messages' && payload.unread > 0 ? (
                    <Badge size="sm" color="red" variant="filled" circle>
                      {payload.unread}
                    </Badge>
                  ) : undefined
                }
              >
                {entry.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Group gap="sm" wrap="nowrap" ml="auto">
          {several && (
            <Select
              size="sm"
              w={150}
              variant="unstyled"
              aria-label="Langue affichée"
              data={payload.site.languages.map((entry) => ({
                value: entry.code,
                label: entry.draft
                  ? `${entry.label} (en préparation)`
                  : entry.label,
              }))}
              value={language}
              allowDeselect={false}
              onChange={(value) => onLanguage(value ?? language)}
            />
          )}
          <Text size="sm" c="dimmed">
            {payload.account}
          </Text>
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={async () => {
              await signOut()
              onSignedOut()
            }}
          >
            Se déconnecter
          </Button>
        </Group>
      </header>

      <main className="basalte-main">
        <div className="basalte-head">
          <div className="basalte-head__facts">
            <div className="basalte-head__title">
              <Text
                component="h1"
                fz="var(--panel-text-display)"
                fw={700}
                lh={1.05}
                m={0}
              >
                {heading}
              </Text>
              {dirty ? (
                <Badge color="orange">Modifications non enregistrées</Badge>
              ) : (
                <Badge color="green">Tout est enregistré</Badge>
              )}
            </div>

            <Group gap="xs">
              {savedAt !== undefined && (
                <Text size="sm" c="dimmed">
                  dernier enregistrement à {MOMENT.format(savedAt)}
                </Text>
              )}
              <Text size="sm" c="dimmed">
                {onlineLabel(publication)}
              </Text>
              {!payload.tracked && (
                <Text size="sm" c="dimmed">
                  sans historique — ce dossier n’est pas un dépôt git
                </Text>
              )}
            </Group>
          </div>

          <div className="basalte-head__actions">
            <div className="basalte-head__buttons">
              <Button
                variant="default"
                disabled={screen !== 'edit' || !dirty}
                loading={busy}
                onClick={onSave}
              >
                Enregistrer
              </Button>
              <Button
                color="ink"
                disabled={busy}
                loading={busyOnline}
                onClick={onPublish}
              >
                Mettre en ligne
              </Button>
            </div>
            <Text size="xs" c="dimmed" ta="right">
              Enregistrer garde votre travail. Mettre en ligne le montre aux
              visiteurs.
            </Text>
          </div>
        </div>

        {payload.problems.length > 0 && (
          <Alert color="orange" title="À corriger">
            {payload.problems.map((problem, rank) => (
              <Text key={`${rank}-${problem.message}`} size="sm">
                {problem.message}
              </Text>
            ))}
          </Alert>
        )}

        {last?.outcome === 'failed' && !busyOnline && (
          <Alert
            color="orange"
            title="La dernière mise en ligne n’a pas abouti"
          >
            <Text size="sm">{last.message}</Text>
          </Alert>
        )}

        {problems.length > 0 && (
          <Alert color="red" title="Rien n’a été enregistré">
            {problems.map((problem, rank) => (
              <Text key={`${rank}-${problem}`} size="sm">
                {problem}
              </Text>
            ))}
          </Alert>
        )}

        {children}
      </main>
    </div>
  )
}

// Une seule ligne, toujours au même endroit : c’est là que le client vient
// vérifier que ce qu’il a écrit est bien sorti.
function onlineLabel(publication: PublishState): string {
  if (publication.running) return 'mise en ligne en cours…'
  if (publication.queued) return 'mise en ligne en attente'

  const last = publication.last

  if (last === undefined) return 'jamais mis en ligne'

  return last.outcome === 'published'
    ? `en ligne depuis le ${ONLINE.format(last.at)}`
    : `dernière tentative le ${ONLINE.format(last.at)}`
}
