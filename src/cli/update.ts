// `basalte update` : monte un site de version, ou n’a pas eu lieu.
//
// La sortie est structurée et le format des notes est figé : c’est ce qui rend
// possible la mise à jour assistée, où un agent lit la ligne « Action requise »
// avant de décider quoi que ce soit.

import { readSocle } from '../client/socle.js'
import { applyUpgrade, planUpgrade, type Upgrade } from '../client/upgrade.js'
import type { ReleaseNote } from '../client/notes.js'
import { fails, hasFlag, heading, line, succeeds } from './args.js'
import type { Result } from './run.js'

export async function update(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const socle = readSocle()
  const upgrade = await planUpgrade(cwd, socle)
  const asJson = hasFlag(argv, '--json')

  if (upgrade === undefined) {
    return asJson
      ? json({
          ...summary({ from: socle.version, to: socle.version, notes: [] }),
          steps: [],
        })
      : succeeds([
          ...heading('update'),
          line('ok', `déjà en v${socle.version}, rien de plus récent publié`),
        ])
  }

  if (hasFlag(argv, '--dry-run')) {
    return asJson
      ? json({ ...summary(upgrade), steps: [] })
      : succeeds([
          ...heading('update'),
          line(
            'warning',
            `v${upgrade.from} → v${upgrade.to}, rien n’a été écrit`,
          ),
          '',
          ...notes(upgrade),
        ])
  }

  process.stdout.write(
    [
      ...heading('update'),
      line('ok', `v${upgrade.from} → v${upgrade.to}`),
      '',
      ...notes(upgrade),
      '',
    ].join('\n'),
  )

  const steps = await applyUpgrade(cwd, upgrade, socle)
  const broken = steps.find((step) => !step.ok)

  if (asJson) {
    return json({ ...summary(upgrade), steps }, broken === undefined ? 0 : 1)
  }

  const lines = steps.map((step) =>
    line(
      step.ok ? 'ok' : 'error',
      step.detail === undefined ? step.label : `${step.label} — ${step.detail}`,
    ),
  )

  return broken === undefined
    ? succeeds([
        ...lines,
        '',
        `Le dépôt est en v${upgrade.to}. Rien n’est encore en ligne.`,
      ])
    : fails(lines, 'La mise à jour n’a pas eu lieu. Le dépôt est comme avant.')
}

function summary(upgrade: Upgrade): Record<string, unknown> {
  return {
    from: upgrade.from,
    to: upgrade.to,
    action: strongest(upgrade.notes),
    notes: upgrade.notes,
  }
}

/** L’exigence la plus forte de toutes les notes traversées. */
function strongest(found: readonly ReleaseNote[]): string {
  const order = ['aucune', 'automatique', 'inconnue', 'manuelle']

  return found.reduce(
    (worst, note) =>
      order.indexOf(note.action) > order.indexOf(worst) ? note.action : worst,
    'aucune',
  )
}

function notes(upgrade: Upgrade): readonly string[] {
  return upgrade.notes.flatMap((note) => [
    ...note.body.split('\n').map((entry) => `  ${entry}`),
    '',
  ])
}

function json(value: unknown, code = 0): Result {
  return { code, stdout: `${JSON.stringify(value, null, 2)}\n`, stderr: '' }
}
