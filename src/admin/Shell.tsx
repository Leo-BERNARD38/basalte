// Le cadre du panel : la navigation, ce qui a échoué, la barre d’application
// — seul endroit où agir sur l’état du site — et ce qui vient de se passer.
//
// La navigation est celle de Material (D204) : un rail à gauche sur un écran
// large, une barre en bas sur un écran étroit, et les mêmes cinq destinations
// dans les deux. Le compte n’en est pas une : il se tient derrière l’avatar,
// au pied du rail ou au bout de la barre d’application, avec la déconnexion.
// Cinq est le plafond d’une barre, et c’est ce qui a sorti « Compte » de la
// liste — on y va une fois par mois, pas entre deux sections.
//
// La barre d’application dit trois choses, et chacune une seule fois : ce qui
// est ouvert, par son titre ; l’état du site en ligne, par une marque à côté
// du titre — en ligne depuis quand, jamais, en cours, ou échoué ; et s’il
// reste quelque chose à enregistrer, par le bouton lui-même, qui lit
// « Enregistré » tant qu’il n’y a rien à faire. Une ligne de contexte
// concaténait ces états avec l’heure du dernier enregistrement et l’absence
// d’historique git : trois natures d’information dans une phrase, dont deux
// que le client ne demandait pas.
//
// Ce qui a échoué au niveau du site se dit en bandeau plein sous la barre,
// sur les deux écrans qui mettent en ligne — c’est là qu’on y remédie ; les
// autres écrans n’en portent que la marque. Ce qui se corrige champ par champ
// reste dans la page, en liste cliquable (D166). Ce qui vient de réussir se
// dit une fois, en bas, dans une snackbar qui s’efface d’elle-même (D205).
//
// Le « ? » de la barre explique l’écran ouvert (D169). Il est à côté des
// actions et non parmi elles : lire n’agit sur rien. Il se referme avec
// l’écran qu’il expliquait.

import type { ReactNode } from 'react'

import type { ContentIssue } from '../content/report.js'
import type { PublishState } from '../publish/publish.js'
import type { PanelPayload } from '../server/panel.js'
import type { Capabilities } from '../site/capabilities.js'
import { Help } from './Help.js'
import { Badge } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { LinearProgress, Snackbar } from './ui/Feedback.js'
import {
  AccountCircle,
  Check,
  Edit as EditIcon,
  Logout,
  Mail,
  Monitoring,
  Newspaper,
  PhotoLibrary,
} from './ui/icons.js'
import { Divider, Group, Stack } from './ui/Layout.js'
import {
  AccountMenu,
  Brand,
  Navigation,
  TopAppBar,
  type Destination,
} from './ui/Navigation.js'
import { Row, RowGlyph, RowText } from './ui/Row.js'
import { Alert, Banner } from './ui/Surface.js'
import { Eyebrow, Text, Title } from './ui/Text.js'

export type Screen =
  'edit' | 'journal' | 'media' | 'messages' | 'stats' | 'account'

// L’ordre suit la fréquence d’usage. Arriver à dix signifierait que deux
// d’entre eux auraient dû fusionner (`panel.md`) ; « Actualités » vient en
// second parce qu’un site qui tient un journal y revient chaque jour, quand il
// n’édite ses pages que de loin en loin. « Compte » est le seul qui ne soit
// pas une destination du rail.
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

const ICONS: Readonly<Record<Screen, ReactNode>> = {
  edit: <EditIcon size={20} />,
  journal: <Newspaper size={20} />,
  media: <PhotoLibrary size={20} />,
  messages: <Mail size={20} />,
  stats: <Monitoring size={20} />,
  account: <AccountCircle size={20} />,
}

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
const FILLS = new Set<Screen>(['edit', 'journal', 'media', 'messages'])

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
  problems,
  refusal,
  issues,
  onIssue,
  publication,
  notice,
  onNoticeDone,
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
  readonly problems: readonly string[]
  /** Ce que le refus annonce. Sans lui, il s’agit d’un enregistrement. */
  readonly refusal?: string | undefined
  /** Ce qui bloque, avec la section et le champ que le serveur a nommés. */
  readonly issues: readonly ContentIssue[]
  readonly onIssue: (issue: ContentIssue) => void
  readonly publication: PublishState
  /** Ce qui vient de réussir, dit une fois. */
  readonly notice: string | undefined
  readonly onNoticeDone: () => void
  readonly onSave: () => void
  readonly onPublish: () => void
  readonly onSignOut: () => void
  readonly children: ReactNode
}) {
  const busyOnline = publication.running || publication.queued
  const last = publication.last
  const writes = WRITES.has(screen)

  const destinations: readonly Destination<Screen>[] = screensFor(
    payload.site.capabilities,
    payload.journal !== undefined,
  )
    .filter((entry) => entry.value !== 'account')
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
      icon: ICONS[entry.value],
      pending: entry.value === 'messages' ? payload.unread : undefined,
    }))

  const account = (
    <AccountMenu label="Réglages">
      <Stack gap="xs">
        <div className="basalte-menu__note">
          <Text role="label-md" tone="meta">
            {payload.account}
          </Text>
        </div>
        <Row
          current={screen === 'account'}
          pill
          onClick={() => onScreen('account')}
        >
          <RowGlyph>{ICONS.account}</RowGlyph>
          <RowText>Compte</RowText>
        </Row>
        <Divider />
        <Row disabled={busy} pill onClick={onSignOut}>
          <RowGlyph>
            <Logout size={18} />
          </RowGlyph>
          <RowText>Se déconnecter</RowText>
        </Row>
      </Stack>
    </AccountMenu>
  )

  const navigation = (form: 'rail' | 'bar') => (
    <Navigation
      form={form}
      items={destinations}
      current={screen}
      onChange={onScreen}
      head={<Brand name={payload.site.name} />}
      foot={account}
    />
  )

  // L’écran ne se nomme au-dessus du titre que lorsque le titre dit autre
  // chose : une page, un billet. Sur « Médias », les deux lignes se répétaient.
  const context = SCREENS.find(
    (entry) => entry.value === screen && entry.label !== heading,
  )?.label

  return (
    <div className="basalte-shell">
      {navigation('rail')}

      <div className="basalte-shell__column">
        <TopAppBar
          context={
            context === undefined ? undefined : <Eyebrow>{context}</Eyebrow>
          }
          title={
            <Group gap="md" wrap>
              <Title level={1} role="headline-sm">
                {heading}
              </Title>
              <Publication publication={publication} />
            </Group>
          }
          actions={
            writes ? (
              <>
                <Button
                  variant="tonal"
                  disabled={!dirty}
                  busy={busy}
                  icon={dirty ? undefined : <Check size={18} />}
                  onClick={onSave}
                >
                  {dirty ? 'Enregistrer' : 'Enregistré'}
                </Button>
                <Button
                  variant="filled"
                  disabled={busy}
                  busy={busyOnline}
                  onClick={onPublish}
                >
                  Mettre en ligne
                </Button>
              </>
            ) : undefined
          }
          tools={
            <>
              <Help key={screen} screen={screen} payload={payload} />
              <span className="basalte-appbar__account">{account}</span>
            </>
          }
        />

        {busyOnline && <LinearProgress label="Mise en ligne en cours" />}

        {/* Ce qui a échoué au niveau du site se dit en bandeau plein, d’un
            bord à l’autre et sous la barre, là où l’on peut relancer. Ce qui
            se corrige champ par champ reste dans la page, où le clic mène à
            l’endroit fautif. */}
        {writes && last?.outcome === 'failed' && !busyOnline && (
          <Alert title="La dernière mise en ligne n’a pas abouti">
            {last.message}
          </Alert>
        )}

        {issues.length === 0 && problems.length > 0 && (
          <Alert title={refusal ?? 'Rien n’a été enregistré'}>
            {problems.join(' · ')}
          </Alert>
        )}

        <main
          className="basalte-main"
          data-fill={FILLS.has(screen) ? 'true' : undefined}
        >
          <Stack gap="region">
            {/* Chaque ligne mène au champ qu’elle nomme : le serveur sait
                quelle section et quel champ, et une liste de phrases faisait
                relire l’écran à la main pour retrouver lequel (D166). */}
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

      {navigation('bar')}

      <Snackbar message={notice} onDone={onNoticeDone} />
    </div>
  )
}

/**
 * L’état du site en ligne, en une marque à côté du titre. C’est la même sur
 * tous les écrans, et c’est là que le client vient vérifier que ce qu’il a
 * écrit est bien sorti.
 */
function Publication({ publication }: { readonly publication: PublishState }) {
  if (publication.running)
    return <Badge dot="ink">Mise en ligne en cours…</Badge>
  if (publication.queued)
    return <Badge dot="ink">Mise en ligne en attente</Badge>

  const last = publication.last

  if (last === undefined) return <Badge tone="muted">Jamais mis en ligne</Badge>

  return last.outcome === 'published' ? (
    <Badge dot="online" tone="muted">
      En ligne depuis le {ONLINE.format(last.at)}
    </Badge>
  ) : (
    <Badge tone="refused">
      Mise en ligne échouée le {ONLINE.format(last.at)}
    </Badge>
  )
}

/** Ce que la ligne d’un incident nomme avant son message. */
function where(issue: ContentIssue): string {
  const parts = [issue.section?.label, issue.field].filter(
    (part): part is string => part !== undefined,
  )

  return parts.length === 0 ? '' : `${parts.join(' › ')} : `
}
