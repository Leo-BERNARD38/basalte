// Le cadre du panel : la navigation, ce qui a échoué, et l’en-tête d’écran —
// seul endroit où agir sur l’état du site.
//
// La barre est noire, et l’onglet ouvert y est une pastille blanche : l’outil
// se tient au-dessus du document, pas à côté, et le blanc reste à la page
// qu’on fabrique. Elle ne porte que la session — le compte, la déconnexion, le
// « ? » à son extrémité droite. La langue écrite n’y est pas : elle décide de
// ce qu’on écrit, pas de qui est connecté, et vit avec le choix de la page
// (`Language.tsx`).
//
// Sous la barre, un bandeau plein d’un bord à l’autre dit ce qui a échoué au
// niveau du site. Il ne défile pas et n’appartient à aucun écran : c’est la
// forme de l’annonce, réservée à ce qui ne s’attache à aucun champ. Ce qui se
// corrige champ par champ reste dans la page, en liste cliquable (D166).
//
// Trois informations sont lisibles en permanence : reste-t-il quelque chose à
// enregistrer, quand la dernière modification a-t-elle été enregistrée, et
// quelque chose est-il cassé. Elles vivent sous le titre, à côté des deux
// boutons, pour qu’un seul regard suffise.
//
// Le titre nomme ce qui est ouvert ; l’œilleton qui le surmonte nomme l’écran.
// Ce que les deux boutons font est à un clic, sous le « ? » de la barre, avec
// tout ce que cet écran-là explique (D169). Le « ? » est dans la barre et non
// dans l’en-tête : celui-ci ne porte que ce qui agit sur le site, et lire
// n’agit sur rien. Il est le dernier de la barre, et son panneau se déplie
// donc contre la gouttière plutôt qu’au-dessus des onglets.
//
// Ce qu’il reste à corriger ne vit pas ici : les points à regarder sont dans
// le rail de l’écran d’édition, qui est le seul endroit où on les corrige.
//
// « Enregistrer » et « Mettre en ligne » ne paraissent que sur les deux écrans
// qui écrivent du contenu. Ailleurs ils ne veulent rien dire : une médiathèque
// enregistre à chaque geste, et des messages ne se mettent pas en ligne. La
// place, elle, ne bouge pas — l’en-tête garde sa forme d’un écran à l’autre.

import type { ReactNode } from 'react'

import type { ContentIssue } from '../content/report.js'
import type { PublishState } from '../publish/publish.js'
import type { PanelPayload } from '../server/panel.js'
import type { Capabilities } from '../site/capabilities.js'
import { Help } from './Help.js'
import { Badge, Count } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Group, Stack } from './ui/Layout.js'
import { Alert, Banner } from './ui/Surface.js'
import { Eyebrow, Title } from './ui/Text.js'

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

/**
 * Les deux écrans où « Enregistrer » et « Mettre en ligne » ont un sens : ceux
 * qui tiennent un brouillon. Une médiathèque enregistre à chaque geste, et des
 * messages ne se mettent pas en ligne.
 */
const WRITES = new Set<Screen>(['edit', 'journal'])

/**
 * Les écrans qui tiennent dans la fenêtre plutôt que de la faire défiler. Ce
 * sont ceux qui portent un aperçu : la page ne défile pas sous lui, et il
 * prend toute la hauteur qu’elle laisse.
 */
const FILLS = new Set<Screen>(['edit', 'journal'])

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
  dirty,
  busy,
  savedAt,
  problems,
  refusal,
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
  readonly dirty: boolean
  readonly busy: boolean
  readonly savedAt: number | undefined
  readonly problems: readonly string[]
  /** Ce que le refus annonce. Sans lui, il s’agit d’un enregistrement. */
  readonly refusal?: string | undefined
  /** Ce qui bloque, avec la section et le champ que le serveur a nommés. */
  readonly issues: readonly ContentIssue[]
  readonly onIssue: (issue: ContentIssue) => void
  readonly publication: PublishState
  readonly onSave: () => void
  readonly onPublish: () => void
  readonly onSignOut: () => void
  readonly children: ReactNode
}) {
  const busyOnline = publication.running || publication.queued
  const last = publication.last
  const writes = WRITES.has(screen)

  return (
    <div className="basalte-shell">
      <header className="basalte-topbar">
        <span className="basalte-brand">
          <span className="basalte-brand__mark" />
          {payload.site.name}
        </span>

        <nav className="basalte-tabs" aria-label="Les écrans du panel">
          {screensFor(
            payload.site.capabilities,
            payload.journal !== undefined,
          ).map((entry) => (
            <button
              key={entry.value}
              type="button"
              className="basalte-tab"
              data-on={entry.value === screen ? 'true' : undefined}
              aria-current={entry.value === screen ? 'page' : undefined}
              onClick={() => onScreen(entry.value)}
            >
              {entry.label}
              {entry.value === 'messages' && payload.unread > 0 && (
                <Count>{payload.unread}</Count>
              )}
            </button>
          ))}
        </nav>

        <span className="basalte-topbar__aside">
          <span className="basalte-topbar__account">{payload.account}</span>
          <button
            type="button"
            className="basalte-signout"
            disabled={busy}
            onClick={onSignOut}
          >
            Se déconnecter
          </button>
          <Help screen={screen} payload={payload} />
        </span>
      </header>

      {/* Ce qui a échoué au niveau du site se dit en bandeau plein, d’un bord
          à l’autre et sous la barre : ce n’est l’affaire d’aucun écran, et un
          aplat rouge se lit avant d’être lu. Ce qui se corrige champ par champ
          reste dans la page, où le clic mène à l’endroit fautif. */}
      {last?.outcome === 'failed' && !busyOnline && (
        <Alert title="La dernière mise en ligne n’a pas abouti">
          {last.message}
        </Alert>
      )}

      {issues.length === 0 && problems.length > 0 && (
        <Alert title={refusal ?? 'Rien n’a été enregistré'}>
          {problems.join(' · ')}
        </Alert>
      )}

      <div className="basalte-head">
        <Stack gap="xs">
          <Eyebrow>
            {[
              // L’écran ne se nomme au-dessus du titre que lorsqu’il en dit
              // autre chose : sur « Compte », les deux lignes se répétaient.
              SCREENS.find(
                (entry) => entry.value === screen && entry.label !== heading,
              )?.label,
              savedAt === undefined
                ? undefined
                : `enregistré à ${MOMENT.format(savedAt)}`,
              onlineLabel(publication),
              payload.tracked ? undefined : 'sans historique',
            ]
              .filter((part) => part !== undefined)
              .join(' · ')}
          </Eyebrow>

          <Group gap="md">
            <Title level={1}>{heading}</Title>
            {writes &&
              (dirty ? (
                <Badge dot="ink">Modifications non enregistrées</Badge>
              ) : (
                <Badge dot="online" tone="muted">
                  Tout est enregistré
                </Badge>
              ))}
          </Group>
        </Stack>

        <div className="basalte-head__actions">
          {writes && (
            <>
              <Button disabled={!dirty} busy={busy} onClick={onSave}>
                Enregistrer
              </Button>
              <Button
                tone="ink"
                disabled={busy}
                busy={busyOnline}
                onClick={onPublish}
              >
                Mettre en ligne
              </Button>
            </>
          )}
        </div>
      </div>

      <main
        className="basalte-main"
        data-fill={FILLS.has(screen) ? 'true' : undefined}
      >
        <Stack gap="region">
          {/* Chaque ligne mène au champ qu’elle nomme : le serveur sait quelle
              section et quel champ, et une liste de phrases faisait relire
              l’écran à la main pour retrouver lequel (D166). */}
          {issues.length > 0 && (
            <Banner tone="refused">
              <Stack gap="sm">
                <strong>Rien n’a été enregistré</strong>
                <Stack gap="xs">
                  {issues.map((issue, rank) => (
                    <button
                      key={`${rank}-${issue.message}`}
                      type="button"
                      className="basalte-link basalte-notice"
                      onClick={() => onIssue(issue)}
                    >
                      {where(issue)}
                      {issue.message}
                    </button>
                  ))}
                </Stack>
              </Stack>
            </Banner>
          )}

          {children}
        </Stack>
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
