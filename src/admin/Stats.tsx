// L’écran « Statistiques » : le rapport tiré des logs d’accès.
//
// Les jauges, l’histogramme et les sparklines sont des `div` dont la hauteur ou
// la largeur est un pourcentage. Une bibliothèque de graphiques pèserait plus
// que tout le panel réuni, pour un diagramme que trois règles CSS dessinent
// (D57).
//
// L’écran dit ses limites plutôt que de laisser croire à une mesure exacte :
// c’est un ordre de grandeur, et le client doit le savoir avant d’en tirer une
// conclusion. Chaque indicateur porte donc ce qu’il vaut, et la période qu’il
// couvre : le rapport tient trente jours, et deux de ses quatre chiffres ne se
// recomptent pas sur une fenêtre plus courte.

import { useEffect, useState } from 'react'

import type { AudienceReport, Counted, Daily } from '../analytics/report.js'
import { readAudience } from './api.js'
import { Waiting } from './Waiting.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Banner, Card } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'
import { Segmented, type Segment } from './ui/Toggle.js'

const DAY_MS = 86_400_000

/** Ce que la sparkline d’un indicateur montre, quelle que soit la période. */
const SPARK_DAYS = 14

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
})

const PERIOD = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

const NUMBER = new Intl.NumberFormat('fr-FR')

/** Les colonnes d’un classement : chaque rangée est sa propre grille. */
const RANK_COLUMNS = 'minmax(0, 1fr) 120px 56px'

type Span = '7' | '14' | '30'

const SPANS: readonly Segment<Span>[] = [
  { value: '7', label: '7 jours' },
  { value: '14', label: '14 jours' },
  { value: '30', label: '30 jours' },
]

/** Le jour d’un instant, en temps universel : la clé que le rapport emploie. */
function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

/**
 * Les jours mesurés qui tombent dans une fenêtre. Le rapport ne porte que les
 * jours où quelque chose s’est passé : la fenêtre se découpe sur leur date, et
 * aucun jour n’est inventé pour combler un trou.
 */
function windowOf(
  days: readonly Daily[],
  last: number,
  span: number,
): readonly Daily[] {
  const from = dayKey(last - (span - 1) * DAY_MS)
  const to = dayKey(last)

  return days.filter((day) => day.day >= from && day.day <= to)
}

function total(days: readonly Daily[]): number {
  return days.reduce((sum, day) => sum + day.visits, 0)
}

/**
 * La variation d’une période à celle qui la précède. Elle ne se rend que
 * lorsque le rapport porte assez loin pour la calculer : sur trente jours, il
 * n’y a rien avant.
 */
function changeOf(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined

  const ratio = Math.round(((current - previous) / previous) * 100)

  return `${ratio > 0 ? '+' : ''}${NUMBER.format(ratio)} %`
}

export function Stats({
  onSignedOut,
}: {
  readonly onSignedOut: (message: string) => void
}) {
  const [audience, setAudience] = useState<AudienceReport | undefined>(
    undefined,
  )
  const [problem, setProblem] = useState('')
  const [span, setSpan] = useState<Span>('30')

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
      <Banner tone="refused">
        <Stack gap="xs">
          <strong>Le rapport n’a pas pu être lu</strong>
          <Text tone="muted">{problem}</Text>
        </Stack>
      </Banner>
    )
  }

  if (audience === undefined) return <Waiting what="Lecture des journaux…" />

  if (!audience.readable) {
    return (
      <Banner>
        <Stack gap="xs">
          <strong>Aucune mesure disponible</strong>
          <Text tone="muted">
            Les journaux d’accès ne sont pas lisibles depuis le panel. Le site
            continue de fonctionner : seule cette page est vide.
          </Text>
        </Stack>
      </Banner>
    )
  }

  const days = Number(span)
  const shown = windowOf(audience.days, audience.to, days)
  const before = windowOf(audience.days, audience.to - days * DAY_MS, days)
  const from = Math.max(audience.from, audience.to - (days - 1) * DAY_MS)

  const visits = total(shown)
  const measured = shown.length
  const mean = measured === 0 ? 0 : visits / measured
  const meanBefore = before.length === 0 ? 0 : total(before) / before.length

  const peak = Math.max(1, ...shown.map((day) => day.visits))
  const spark = audience.days.slice(-SPARK_DAYS)

  return (
    <Stack gap="xl">
      <Group gap="md">
        <Text tone="meta">
          Du {PERIOD.format(from)} au {PERIOD.format(audience.to)}
        </Text>
        <Spacer />
        <Segmented
          value={span}
          items={SPANS}
          onChange={setSpan}
          label="La période regardée"
          tone="ink"
        />
      </Group>

      <Card tone="raised">
        <div className="basalte-figures">
          <Figure
            label="Visites"
            value={visits}
            change={changeOf(visits, total(before))}
            note="Pages vues sur la période, robots écartés."
            spark={spark.map((day) => day.visits)}
          />
          <Figure
            label="Visiteurs"
            value={audience.visitors}
            note="Sur les trente jours du rapport : deux personnes derrière la même connexion comptent pour une."
            spark={spark.map((day) => day.visitors)}
          />
          <Figure
            label="Visites par jour"
            value={Math.round(mean)}
            change={changeOf(mean, meanBefore)}
            note="Moyenne des jours mesurés de la période."
            spark={spark.map((day) => day.visits)}
          />
          <Figure
            label="Messages envoyés"
            value={audience.forms}
            note="Formulaires de contact reçus, sur les trente jours du rapport."
          />
        </div>
      </Card>

      <Card>
        <Stack gap="lg">
          <Title rank="card">Visites par jour</Title>

          {measured === 0 ? (
            <Text tone="meta" size="small">
              Aucune visite sur la période.
            </Text>
          ) : (
            <>
              <div className="basalte-chart">
                <div className="basalte-chart__bars">
                  {shown.map((day, rank) => (
                    <div
                      key={day.day}
                      className="basalte-chart__bar"
                      data-today={rank === measured - 1 ? 'true' : undefined}
                      style={{ height: `${(day.visits / peak) * 100}%` }}
                    />
                  ))}
                </div>
                <div
                  className="basalte-chart__mean"
                  style={{ bottom: `${(mean / peak) * 100}%` }}
                />
              </div>

              <Group gap="md">
                <Eyebrow>{label(shown[0])}</Eyebrow>
                <Spacer />
                <Eyebrow>
                  moyenne {NUMBER.format(Math.round(mean))} par jour
                </Eyebrow>
                <Spacer />
                <Eyebrow>{label(shown[measured - 1])}</Eyebrow>
              </Group>
            </>
          )}
        </Stack>
      </Card>

      <div className="basalte-split">
        <Ranking
          title="Pages les plus vues"
          head="Page"
          empty="Aucune page consultée."
          rows={audience.pages}
        />
        <Ranking
          title="D’où viennent les visiteurs"
          head="Provenance"
          empty="Aucune provenance connue : la plupart des visites arrivent en direct."
          rows={audience.referrers}
        />
      </div>
    </Stack>
  )
}

/** Le jour d’une barre, tel qu’on le lit sous l’histogramme. */
function label(day: Daily | undefined): string {
  return day === undefined
    ? ''
    : DAY_LABEL.format(new Date(`${day.day}T00:00:00Z`))
}

/**
 * Un indicateur : son chiffre, ce qu’il vaut, et les quatorze derniers jours
 * mesurés. La sparkline manque à ce que le rapport ne compte pas jour par jour
 * — un envoi de formulaire n’a pas de courbe.
 */
function Figure({
  label: name,
  value,
  change,
  note,
  spark,
}: {
  readonly label: string
  readonly value: number
  readonly change?: string | undefined
  readonly note: string
  readonly spark?: readonly number[] | undefined
}) {
  const ceiling = spark === undefined ? 1 : Math.max(1, ...spark)

  return (
    <Stack gap="sm">
      <Eyebrow>{name}</Eyebrow>
      <Mono className="basalte-figure">{NUMBER.format(value)}</Mono>
      {change !== undefined && <Text tone="accent">{change}</Text>}
      <Text tone="meta" size="small">
        {note}
      </Text>
      {spark !== undefined && spark.length > 0 && (
        <div className="basalte-spark">
          {spark.map((height, rank) => (
            <div
              key={rank}
              className="basalte-spark__bar"
              data-today={rank === spark.length - 1 ? 'true' : undefined}
              style={{ height: `${(height / ceiling) * 100}%` }}
            />
          ))}
        </div>
      )}
    </Stack>
  )
}

function Ranking({
  title,
  head,
  empty,
  rows,
}: {
  readonly title: string
  readonly head: string
  readonly empty: string
  readonly rows: readonly Counted[]
}) {
  const peak = Math.max(1, ...rows.map((row) => row.visits))

  return (
    <Card>
      <Stack gap="lg">
        <Title rank="card">{title}</Title>

        {rows.length === 0 ? (
          <Text tone="meta" size="small">
            {empty}
          </Text>
        ) : (
          <div className="basalte-table">
            <div
              className="basalte-table__row"
              data-head="true"
              style={{ gridTemplateColumns: RANK_COLUMNS }}
            >
              <Eyebrow>{head}</Eyebrow>
              <Eyebrow>Part</Eyebrow>
              <Eyebrow>Visites</Eyebrow>
            </div>

            {rows.map((row) => (
              <div
                key={row.key}
                className="basalte-table__row"
                style={{ gridTemplateColumns: RANK_COLUMNS }}
              >
                <Text className="basalte-row__text">{row.key}</Text>
                <div className="basalte-gauge">
                  <div
                    className="basalte-gauge__fill"
                    style={{ width: `${(row.visits / peak) * 100}%` }}
                  />
                </div>
                <Mono>{NUMBER.format(row.visits)}</Mono>
              </div>
            ))}
          </div>
        )}
      </Stack>
    </Card>
  )
}
