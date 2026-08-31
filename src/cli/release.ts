// `basalte release` : la mise en forme du geste, jamais sa logique.
//
// Deux passes, et c’est voulu : la première écrit le gabarit de la note et
// s’arrête, la seconde publie. Le rang et l’effet sur un site existant sont un
// jugement qu’aucune commande ne rend à la place de celui qui publie — mais
// tout ce qui l’entoure, lui, se refuse.

import { readSocle } from '../client/socle.js'
import {
  applyRelease,
  planRelease,
  writeNote,
  RANKS,
  type Plan,
} from '../release/release.js'
import { fails, fix, heading, line, positionals, succeeds } from './args.js'
import type { Result } from './run.js'

/** La table de `docs/mise-a-jour.md`, là où le rang se choisit. */
const SCALE: readonly (readonly [string, string])[] = [
  [
    'patch',
    'rien ne change pour un site existant — correction, texte, performance',
  ],
  [
    'minor',
    'des blocs, des champs ou des capacités s’ajoutent ; une migration tourne toute seule',
  ],
  ['major', 'quelque chose doit être touché à la main dans le dépôt client'],
]

export async function release(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const target = positionals(argv)[0]

  if (target === undefined) {
    return fails([
      `« basalte release » attend un rang (${RANKS.join(', ')}) ou un numéro « X.Y.Z ».`,
      '',
      'Le rang se choisit sur ce qu’un site existant a à faire, jamais sur la',
      'quantité de travail accompli :',
      '',
      ...scale(),
    ])
  }

  const socle = readSocle()
  const plan = await planRelease(cwd, socle, target)

  if (plan.kind === 'blocked') {
    return fails([...heading('release'), line('error', plan.reason)])
  }

  if (plan.kind === 'draft') {
    await writeNote(cwd, plan.release, plan.template)

    return succeeds(drafted(plan))
  }

  process.stdout.write(
    [
      ...heading('release', plan.release.tag),
      line('ok', `v${plan.release.from} → v${plan.release.to}`),
      line('ok', `action requise : ${plan.release.action ?? 'aucune'}`),
      '',
      'verify d’abord — quelques minutes.',
      '',
    ].join('\n'),
  )

  const steps = await applyRelease(cwd, plan.release)
  const broken = steps.find((step) => !step.ok)

  const written = steps.map((step) =>
    line(
      step.ok ? 'ok' : 'error',
      step.detail === undefined ? step.label : `${step.label} — ${step.detail}`,
    ),
  )

  return broken === undefined
    ? succeeds([
        ...written,
        '',
        `${plan.release.tag} est publiée. Un dépôt client l’installe par « npm run update ».`,
      ])
    : fails(written, 'La publication n’a pas eu lieu.')
}

function drafted(plan: Extract<Plan, { kind: 'draft' }>): readonly string[] {
  const written = [
    ...heading('release', plan.release.tag),
    line(
      'warning',
      `« ${plan.release.note} » était absente : le gabarit vient d’y être écrit`,
    ),
    fix(
      'porte l’action requise et ce qui change, puis relance la même commande.',
    ),
    '',
    'Le rang :',
    '',
    ...scale(),
    '',
    'Une note dit l’effet sur un site existant, jamais le travail accompli ici,',
    'et elle ne renvoie ni à un commit ni à une issue : elle se suffit.',
  ]

  if (plan.since === undefined) {
    return [
      ...written,
      '',
      `Le tag v${plan.release.from} n’est pas dans ce clone : « git fetch --tags »`,
      'pour voir ce que la version emporte.',
    ]
  }

  return [
    ...written,
    '',
    `Ce que la version emporte (${plan.since.length} commit(s)), à traduire en effets :`,
    '',
    ...plan.since.map((subject) => `    ${subject}`),
  ]
}

function scale(): readonly string[] {
  const width = Math.max(...SCALE.map(([rank]) => rank.length))

  return SCALE.map(([rank, effect]) => `  ${rank.padEnd(width)}  ${effect}`)
}
