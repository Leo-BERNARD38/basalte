// Le cadre du panel : la navigation, la langue affichée, et l’en-tête d’écran
// — seul endroit où agir sur l’état du site.
//
// Trois informations y sont lisibles en permanence : reste-t-il quelque chose
// à enregistrer, quand la dernière modification a-t-elle été enregistrée, et
// quelque chose est-il cassé. Elles vivent sous le titre, à côté des deux
// boutons, pour qu’un seul regard suffise — sur une ligne, dans un ordre fixe.
//
// Le titre nomme ce qui est ouvert ; l’œilleton qui le surmonte nomme l’écran.
// Il disait l’un ou l’autre : sur « Édition », le nom de la page remplaçait
// celui de l’écran, et rien ne rappelait où l’on était.
//
// Une quatrième les accompagne, et c’est une phrase : deux boutons côte à côte
// n’expliquent pas d’eux-mêmes que l’un garde et que l’autre montre. C’est la
// question que le client pose le plus souvent, et elle se règle ici plutôt que
// dans un écran d’aide qui n’existera pas (D63).
//
// « Enregistrer » suit le badge, et rien d’autre : il était grisé partout
// ailleurs que sur « Édition », si bien qu’un billet modifié affichait
// « Modifications non enregistrées » à côté du seul bouton capable de les
// enregistrer, éteint. Un avertissement sur lequel on ne peut pas agir vaut
// moins que pas d’avertissement.

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import { useState, type ReactNode } from 'react'

import type { ContentIssue } from '../content/report.js'
import type { PublishState } from '../publish/publish.js'
import type { PanelPayload } from '../server/panel.js'
import type { Capabilities } from '../site/capabilities.js'

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

/** Ce qu’un bandeau montre avant qu’on lui demande le reste. */
const SHOWN = 3

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
  issues,
  onIssue,
  publication,
  onSave,
  onPublish,
  onSignOut,
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
  /** Ce qui bloque, avec la section et le champ que le serveur a nommés. */
  readonly issues: readonly ContentIssue[]
  readonly onIssue: (issue: ContentIssue) => void
  readonly publication: PublishState
  readonly onSave: () => void
  readonly onPublish: () => void
  readonly onSignOut: () => void
  readonly children: ReactNode
}) {
  const [all, setAll] = useState(false)
  const several = payload.site.languages.length > 1
  const busyOnline = publication.running || publication.queued
  const last = publication.last
  const blocking = payload.problems.some(
    (problem) => problem.severity === 'error',
  )

  return (
    <div className="basalte-shell">
      <header className="basalte-topbar">
        <span className="basalte-brand">
          <span className="basalte-brand__mark" />
          {payload.site.name}
        </span>

        <Tabs
          className="basalte-tabs-holder"
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
          <Text size="sm" c="dimmed" visibleFrom="md">
            {payload.account}
          </Text>
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            loading={busy}
            onClick={onSignOut}
          >
            Se déconnecter
          </Button>
        </Group>
      </header>

      <main className="basalte-main">
        <div className="basalte-head">
          <div className="basalte-head__facts">
            <span className="basalte-eyebrow">
              {SCREENS.find((entry) => entry.value === screen)?.label}
            </span>

            <div className="basalte-head__title">
              <Title order={2} component="h1" m={0}>
                {heading}
              </Title>
              {dirty ? (
                <Badge color="orange">Modifications non enregistrées</Badge>
              ) : (
                <Badge color="green">Tout est enregistré</Badge>
              )}
            </div>

            {/* Une ligne, dans un ordre fixe : trois textes gris accolés se
                lisaient comme une phrase, et aucun ne se retrouvait. */}
            <Text size="sm" c="dimmed">
              {[
                savedAt === undefined
                  ? undefined
                  : `dernier enregistrement à ${MOMENT.format(savedAt)}`,
                onlineLabel(publication),
                payload.tracked
                  ? undefined
                  : 'sans historique — ce dossier n’est pas un dépôt git',
              ]
                .filter((part) => part !== undefined)
                .join(' · ')}
            </Text>
          </div>

          <div className="basalte-head__actions">
            <div className="basalte-head__buttons">
              <Button
                variant="default"
                disabled={!dirty}
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
            <Text size="xs" c="dimmed" className="basalte-head__hint">
              Enregistrer garde votre travail. Mettre en ligne le montre aux
              visiteurs.
            </Text>
          </div>
        </div>

        {/* L’état du site, replié à trois lignes. Un site multilingue en
            préparation en porte une par page : déplié, le bandeau prenait le
            tiers de l’écran, tous les jours, pour un avertissement. */}
        {payload.problems.length > 0 && (
          <Alert
            color={blocking ? 'red' : 'orange'}
            title={
              blocking
                ? 'À corriger avant la prochaine mise en ligne'
                : `${payload.problems.length} point${payload.problems.length > 1 ? 's' : ''} à regarder`
            }
          >
            <Stack gap={2} align="flex-start">
              {(all ? payload.problems : payload.problems.slice(0, SHOWN)).map(
                (problem, rank) => (
                  <Text key={`${rank}-${problem.message}`} size="sm">
                    {problem.message}
                  </Text>
                ),
              )}
              {payload.problems.length > SHOWN && (
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  onClick={() => setAll(!all)}
                >
                  {all
                    ? 'Replier'
                    : `Voir les ${payload.problems.length - SHOWN} autres`}
                </Anchor>
              )}
            </Stack>
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

        {/* Chaque ligne mène au champ qu’elle nomme : le serveur sait quelle
            section et quel champ, et une liste de phrases faisait relire
            l’écran à la main pour retrouver lequel (D166). */}
        {issues.length > 0 && (
          <Alert color="red" title="Rien n’a été enregistré">
            <Stack gap={2} align="flex-start">
              {issues.map((issue, rank) => (
                <Anchor
                  key={`${rank}-${issue.message}`}
                  component="button"
                  type="button"
                  size="sm"
                  ta="left"
                  onClick={() => onIssue(issue)}
                >
                  {where(issue)}
                  {issue.message}
                </Anchor>
              ))}
            </Stack>
          </Alert>
        )}

        {issues.length === 0 && problems.length > 0 && (
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

/** Ce que la ligne d’un incident nomme avant son message. */
function where(issue: ContentIssue): string {
  const parts = [issue.section?.label, issue.field].filter(
    (part): part is string => part !== undefined,
  )

  return parts.length === 0 ? '' : `${parts.join(' › ')} : `
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
