// L’écran « Statistiques » : le rapport tiré des logs d’accès.
//
// Les jauges sont des `div` dont la largeur est un pourcentage. Une
// bibliothèque de graphiques pèserait plus que tout le panel réuni, pour un
// diagramme que trois règles CSS dessinent (D57).
//
// L’écran dit ses limites plutôt que de laisser croire à une mesure exacte :
// c’est un ordre de grandeur, et le client doit le savoir avant d’en tirer une
// conclusion.

import { Alert, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'

import type { AudienceReport, Counted } from '../analytics/report.js'
import { readAudience } from './api.js'
import { Waiting } from './Waiting.js'

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
})

const PERIOD = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export function Stats({
  onSignedOut,
}: {
  readonly onSignedOut: (message: string) => void
}) {
  const [audience, setAudience] = useState<AudienceReport | undefined>(
    undefined,
  )
  const [problem, setProblem] = useState('')

  useEffect(() => {
    const load = async () => {
      const answer = await readAudience()

      if (answer.ok) setAudience(answer.data.audience)
      else if (answer.signedOut) onSignedOut(answer.message)
      else setProblem(answer.message)
    }

    void load()
  }, [])

  if (problem !== '') {
    return (
      <Alert color="red" title="Le rapport n’a pas pu être lu">
        {problem}
      </Alert>
    )
  }

  if (audience === undefined) return <Waiting what="Lecture des journaux…" />

  if (!audience.readable) {
    return (
      <Stack gap="md" maw="var(--panel-measure-page)">
        <Alert color="orange" title="Aucune mesure disponible">
          Les journaux d’accès ne sont pas lisibles depuis le panel. Le site
          continue de fonctionner : seule cette page est vide.
        </Alert>
      </Stack>
    )
  }

  const peak = Math.max(1, ...audience.days.map((day) => day.visits))

  return (
    <Stack gap="md" maw="var(--panel-measure-page)">
      <Text size="sm" c="dimmed">
        Du {PERIOD.format(audience.from)} au {PERIOD.format(audience.to)}
      </Text>

      <Group grow align="stretch">
        <Figure label="Visites" value={audience.visits} />
        <Figure label="Visiteurs" value={audience.visitors} />
        <Figure label="Messages envoyés" value={audience.forms} />
      </Group>

      <Paper p="md">
        <Stack gap="xs">
          <Title order={3}>Jour par jour</Title>
          {audience.days.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucune visite sur la période.
            </Text>
          ) : (
            audience.days.map((day) => (
              <Group key={day.day} gap="sm" wrap="nowrap">
                <Text size="sm" c="dimmed" w={72}>
                  {DAY_LABEL.format(new Date(`${day.day}T00:00:00Z`))}
                </Text>
                <div className="basalte-gauge">
                  <div
                    className="basalte-gauge__fill"
                    style={{ width: `${(day.visits / peak) * 100}%` }}
                  />
                </div>
                <Text size="sm" w={48} ta="right">
                  {day.visits}
                </Text>
              </Group>
            ))
          )}
        </Stack>
      </Paper>

      <Group grow align="flex-start">
        <Ranking
          title="Pages les plus vues"
          empty="Aucune page consultée."
          rows={audience.pages}
        />
        <Ranking
          title="D’où viennent les visiteurs"
          empty="Aucune provenance connue : la plupart des visites arrivent en direct."
          rows={audience.referrers}
        />
      </Group>

      <Text size="xs" c="dimmed">
        Ce rapport est un ordre de grandeur. Il ne pose aucun cookie et ne suit
        personne : deux personnes derrière la même connexion comptent pour une,
        et les robots sont écartés sur leur signature, qui n’est jamais
        complète.
      </Text>
    </Stack>
  )
}

function Figure({
  label,
  value,
}: {
  readonly label: string
  readonly value: number
}) {
  return (
    <Paper p="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz="var(--panel-text-display)" fw={700} lh={1.1}>
        {value}
      </Text>
    </Paper>
  )
}

function Ranking({
  title,
  empty,
  rows,
}: {
  readonly title: string
  readonly empty: string
  readonly rows: readonly Counted[]
}) {
  return (
    <Paper p="md">
      <Stack gap="xs">
        <Title order={3}>{title}</Title>
        {rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            {empty}
          </Text>
        ) : (
          rows.map((row) => (
            <Group key={row.key} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate="end">
                {row.key}
              </Text>
              <Text size="sm" c="dimmed">
                {row.visits}
              </Text>
            </Group>
          ))
        )}
      </Stack>
    </Paper>
  )
}
