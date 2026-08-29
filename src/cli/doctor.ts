// `basalte doctor` : la preuve que la configuration fonctionne, à la place du
// guide de provisionnement que personne ne tient à jour.
//
// Il tourne là où on l’appelle. Depuis la machine du mainteneur, il éprouve la
// configuration du dépôt ; sur le VPS, les mêmes sondes portent en plus sur ses
// ressources. `--host` compare l’enregistrement DNS à l’adresse attendue.

import { resolve4 } from 'node:dns/promises'

import { diagnose, type Probe } from '../deploy/probes.js'
import { loadEnvironment } from '../server/open.js'
import { loadSite } from '../site/load.js'
import {
  fails,
  fix,
  hasFlag,
  heading,
  line,
  optionValue,
  succeeds,
} from './args.js'
import type { Result } from './run.js'

export async function doctor(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const site = await loadSite(cwd)

  loadEnvironment(cwd)

  const host = optionValue(argv, '--host')

  const probes = await diagnose({
    root: cwd,
    site,
    environment: process.env,
    ...(host === undefined ? {} : { host }),
    send: !hasFlag(argv, '--no-email'),
    resolve: (domain) => resolve4(domain),
  })

  const lines = [...heading('doctor', site.name), ...render(probes)]
  const broken = probes.filter((probe) => probe.level === 'error')

  return broken.length === 0
    ? succeeds(lines)
    : fails(
        lines,
        `${broken.length} chose(s) à corriger avant la mise en ligne.`,
      )
}

function render(probes: readonly Probe[]): readonly string[] {
  return probes.flatMap((probe) => [
    line(probe.level, `${probe.label} — ${probe.detail}`),
    ...(probe.fix === undefined ? [] : [fix(probe.fix)]),
  ])
}
