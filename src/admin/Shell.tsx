// Le cadre du panel : la navigation, la langue affichée, et la barre
// d’enregistrement — seul endroit de l’écran où agir sur l’état du site.
//
// Trois informations y sont lisibles en permanence : reste-t-il quelque chose
// à enregistrer, quand la dernière modification a-t-elle été enregistrée, et
// quelque chose est-il cassé.

import { Alert, Badge, Button, Group, Select, Tabs, Text } from '@mantine/core'
import type { ReactNode } from 'react'

import type { PanelPayload } from '../server/panel.js'
import { signOut } from './api.js'

export type Screen = 'edit' | 'media' | 'account'

export const SCREENS: readonly {
  readonly value: Screen
  readonly label: string
}[] = [
  { value: 'edit', label: 'Édition' },
  { value: 'media', label: 'Médias' },
  { value: 'account', label: 'Compte' },
]

const MOMENT = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })

export function Shell({
  payload,
  screen,
  onScreen,
  language,
  onLanguage,
  dirty,
  busy,
  savedAt,
  problems,
  onSave,
  onPreview,
  onSignedOut,
  children,
}: {
  readonly payload: PanelPayload
  readonly screen: Screen
  readonly onScreen: (screen: Screen) => void
  readonly language: string
  readonly onLanguage: (language: string) => void
  readonly dirty: boolean
  readonly busy: boolean
  readonly savedAt: number | undefined
  readonly problems: readonly string[]
  readonly onSave: () => void
  readonly onPreview: () => void
  readonly onSignedOut: () => void
  readonly children: ReactNode
}) {
  const several = payload.site.languages.length > 1

  return (
    <div className="basalte-shell">
      <header className="basalte-header">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="lg" wrap="nowrap">
            <Text fw={700}>{payload.site.name}</Text>
            <Tabs
              value={screen}
              onChange={(value) => onScreen((value ?? 'edit') as Screen)}
            >
              <Tabs.List>
                {SCREENS.map((entry) => (
                  <Tabs.Tab key={entry.value} value={entry.value}>
                    {entry.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Group>

          <Group gap="sm" wrap="nowrap">
            {several && (
              <Select
                size="xs"
                w={160}
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
              size="xs"
              onClick={async () => {
                await signOut()
                onSignedOut()
              }}
            >
              Se déconnecter
            </Button>
          </Group>
        </Group>
      </header>

      <main className="basalte-main">
        {payload.problems.length > 0 && (
          <Alert color="orange" variant="light" mb="md" title="À corriger">
            {payload.problems.map((problem, rank) => (
              <Text key={`${rank}-${problem.message}`} size="sm">
                {problem.message}
              </Text>
            ))}
          </Alert>
        )}

        {problems.length > 0 && (
          <Alert
            color="red"
            variant="light"
            mb="md"
            title="Rien n’a été enregistré"
          >
            {problems.map((problem, rank) => (
              <Text key={`${rank}-${problem}`} size="sm">
                {problem}
              </Text>
            ))}
          </Alert>
        )}

        {children}
      </main>

      <footer className="basalte-bar">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            {dirty ? (
              <Badge color="orange">Modifications non enregistrées</Badge>
            ) : (
              <Badge color="green" variant="light">
                Tout est enregistré
              </Badge>
            )}
            {savedAt !== undefined && (
              <Text size="xs" c="dimmed">
                dernier enregistrement à {MOMENT.format(savedAt)}
              </Text>
            )}
            {!payload.tracked && (
              <Text size="xs" c="dimmed">
                sans historique — ce dossier n’est pas un dépôt git
              </Text>
            )}
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              disabled={screen !== 'edit' || busy}
              onClick={onPreview}
            >
              Aperçu
            </Button>
            <Button
              disabled={screen !== 'edit' || !dirty}
              loading={busy}
              onClick={onSave}
            >
              Enregistrer
            </Button>
          </Group>
        </Group>
      </footer>
    </div>
  )
}
