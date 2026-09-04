// Ce que le contrôle du site a relevé, en tête du volet d’édition.
//
// Ce n’est pas le refus d’un champ — celui-là atteint le champ qu’il vise
// (D166) — mais ce que le site a de bancal dans son ensemble : une image que
// rien n’emploie, deux pages qui portent le même titre. Ce qui bloque la mise
// en ligne se déplie tout seul ; le reste attend qu’on demande à voir.

import { useState } from 'react'

import type { PanelPayload } from '../server/panel.js'
import { Banner } from './ui/Surface.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Eyebrow, plural, Text } from './ui/Text.js'

type Points = PanelPayload['problems']

/**
 * Les points, rangés sous la page qu’ils visent. Une médiathèque qui porte
 * douze images inemployées écrivait douze phrases identiques à un mot près :
 * groupées, elles font un titre, un compte, et douze lignes qu’on parcourt au
 * lieu de les lire. L’ordre d’arrivée est gardé — c’est celui du contrôle.
 */
function groupProblems(problems: Points): readonly {
  readonly page: string
  readonly points: Points
}[] {
  const pages: string[] = []
  const under = new Map<string, Points[number][]>()

  for (const problem of problems) {
    const found = under.get(problem.page)

    if (found === undefined) {
      pages.push(problem.page)
      under.set(problem.page, [problem])
    } else found.push(problem)
  }

  return pages.map((page) => ({ page, points: under.get(page) ?? [] }))
}

export function Problems({
  points,
  nameOf,
}: {
  readonly points: Points
  /** Le nom que le client lit d’une page, ou d’une entrée qui n’en est pas. */
  readonly nameOf: (entry: string) => string
}) {
  const [all, setAll] = useState(false)

  if (points.length === 0) return null

  const blocking = points.some((problem) => problem.severity === 'error')

  return (
    <Banner tone={blocking ? 'refused' : 'watch'}>
      <Stack gap="sm">
        <Group gap="md">
          <strong>
            {blocking
              ? 'À corriger avant la mise en ligne'
              : `${points.length} ${plural(points.length, 'point')} à regarder`}
          </strong>
          {!blocking && (
            <>
              <Spacer />
              <button
                type="button"
                className="basalte-link"
                onClick={() => setAll(!all)}
              >
                {all ? 'replier' : 'voir'}
              </button>
            </>
          )}
        </Group>
        {(blocking || all) && (
          <Stack gap="md">
            {groupProblems(points).map((group) => (
              <Stack key={group.page} gap="xs" className="basalte-points">
                <Group gap="md" align="baseline">
                  <Eyebrow>{nameOf(group.page)}</Eyebrow>
                  <Spacer />
                  {/* Un compte de un ne dit rien que la ligne en dessous ne
                      dise déjà. */}
                  {group.points.length > 1 && (
                    <Eyebrow>{group.points.length}</Eyebrow>
                  )}
                </Group>
                {group.points.map((point, rank) => (
                  <Text
                    key={`${rank}-${point.message}`}
                    tone="muted"
                    role="label-md"
                  >
                    {point.place === '' ? '' : `${point.place} — `}
                    {point.message}
                  </Text>
                ))}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Banner>
  )
}
