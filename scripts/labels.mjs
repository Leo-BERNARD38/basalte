// Les labels du dépôt, versionnés. Un label posé à la main dans l’interface ne
// se rejoue pas : il n’existe que sur ce dépôt-là, personne ne sait pourquoi il
// a cette couleur, et rien ne dit quand il devient faux. La liste ci-dessous
// est la seule source, et le workflow la rejoue à chaque push sur `main`.
//
// Les noms sont **sans accent**, exprès. Un label est un identifiant de
// requête — il paraît dans chaque URL de filtre, et `label:"différé"` s’écrit
// `label%3A%22diff%C3%A9r%C3%A9%22`. GitHub replie de surcroît les diacritiques
// à la création : « bloqué » et « bloque » se disputeraient le même nom, et le
// second rendrait un 422 `already_exists` que rien n’explique.
//
// Un renommage passe par `PATCH new_name`, jamais par une suppression suivie
// d’une création : le PATCH **préserve le label sur les issues qui le
// portent**, la recréation le perd sans rien dire.
//
// La purge ne retire qu’un label que **rien** ne porte — ni issue, ni pull
// request. Retirer un label porté le décrocherait en silence de vrais tickets,
// et la trace de ce décrochage n’existe nulle part.

import { execFileSync } from 'node:child_process'

/** Ce que le dépôt porte, et rien d’autre. */
const LABELS = [
  {
    name: 'bloque',
    color: '9e6a03',
    description:
      'Une condition n’est pas remplie. Elle est écrite en tête de corps.',
  },
  {
    name: 'annexe',
    color: '0e8a16',
    description: 'Indépendant : faisable à n’importe quel moment.',
  },
  {
    name: 'decision-porteur',
    color: '5319e7',
    description: 'L’arbitrage n’appartient qu’au porteur du projet.',
  },
  {
    name: 'chantier-rendus',
    color: '1d76db',
    description: 'Lot L1 — ce qu’un support a le droit de ne pas montrer.',
  },
  {
    name: 'bug',
    color: 'd73a4a',
    description: 'Un défaut constaté. Se traite tout de suite, sans famille.',
  },
  {
    name: 'documentation',
    color: '0075ca',
    description: 'La documentation dit autre chose que le code.',
  },
  {
    name: 'accessibility',
    color: 'f143ab',
    description:
      'Un obstacle pour qui navigue au clavier, à la loupe ou au lecteur d’écran.',
  },
]

/** Ancien nom → nom d’aujourd’hui. Appliqué avant tout le reste. */
const RENAMES = new Map([])

const VERBS = {
  create: 'crée  ',
  update: 'ajuste',
  rename: 'renomme',
  purge: 'purge ',
  garde: 'garde ',
  ignore: 'ignore',
}

const dry = process.argv.includes('--dry-run')

const repo = gh([
  'repo',
  'view',
  '--json',
  'nameWithOwner',
  '--jq',
  '.nameWithOwner',
])

const present = new Map(
  api(['GET', `repos/${repo}/labels`, '--paginate']).map((label) => [
    label.name,
    label,
  ]),
)

// Ce que portent les issues *et* les pull requests : la purge s’y adosse.
const carried = new Map()
for (const item of api([
  'GET',
  `repos/${repo}/issues?state=all&per_page=100`,
  '--paginate',
])) {
  for (const label of item.labels ?? []) {
    carried.set(label.name, (carried.get(label.name) ?? 0) + 1)
  }
}

const plan = []
const renamed = new Set()

for (const [from, to] of RENAMES) {
  if (!present.has(from)) continue
  if (present.has(to)) {
    plan.push({
      verb: 'ignore',
      name: from,
      say: `renommage impossible : « ${to} » existe déjà`,
    })
    continue
  }
  plan.push({ verb: 'rename', name: from, to })
  renamed.add(to)
}

for (const wanted of LABELS) {
  const source = [...RENAMES].find(([, to]) => to === wanted.name)?.[0]
  const current =
    present.get(wanted.name) ?? (source ? present.get(source) : undefined)

  if (!current) {
    plan.push({ verb: 'create', name: wanted.name, label: wanted })
    continue
  }

  // Un renommage a déjà été planifié : l’ajustement doit viser le nom que le
  // label portera à ce moment-là, sinon il frappe un chemin qui n’existe plus.
  const at = renamed.has(wanted.name) ? wanted.name : current.name

  const sameColor = current.color.toLowerCase() === wanted.color.toLowerCase()
  const sameText = (current.description ?? '') === wanted.description

  if (sameColor && sameText && current.name === wanted.name) continue

  plan.push({ verb: 'update', name: at, label: wanted })
}

const kept = new Set([...LABELS.map((l) => l.name), ...RENAMES.keys()])

for (const [name, label] of present) {
  if (kept.has(name)) continue

  const uses = carried.get(name) ?? 0
  if (uses > 0) {
    plan.push({
      verb: 'garde',
      name,
      say: `hors liste, mais porté par ${uses} ticket${uses > 1 ? 's' : ''} — jamais supprimé`,
    })
    continue
  }

  plan.push({ verb: 'purge', name, label })
}

if (plan.length === 0) {
  console.log(`${repo} : les ${LABELS.length} labels sont déjà en place.`)
  process.exit(0)
}

console.log(
  `${repo} — ${plan.length} opération${plan.length > 1 ? 's' : ''} :\n`,
)
for (const step of plan) {
  console.log(`  ${VERBS[step.verb]}  ${step.name}${detail(step)}`)
}

if (dry) {
  console.log('\n--dry-run : rien n’a été appliqué.')
  process.exit(0)
}

console.log('')

for (const step of plan) {
  if (step.verb === 'ignore' || step.verb === 'garde') continue

  if (step.verb === 'rename') {
    api([
      'PATCH',
      `repos/${repo}/labels/${step.name}`,
      '-f',
      `new_name=${step.to}`,
    ])
  } else if (step.verb === 'create') {
    api([
      'POST',
      `repos/${repo}/labels`,
      '-f',
      `name=${step.label.name}`,
      '-f',
      `color=${step.label.color}`,
      '-f',
      `description=${step.label.description}`,
    ])
  } else if (step.verb === 'update') {
    api([
      'PATCH',
      `repos/${repo}/labels/${step.name}`,
      '-f',
      `new_name=${step.label.name}`,
      '-f',
      `color=${step.label.color}`,
      '-f',
      `description=${step.label.description}`,
    ])
  } else if (step.verb === 'purge') {
    api(['DELETE', `repos/${repo}/labels/${step.name}`])
  }

  console.log(`  fait  ${step.name}`)
}

function detail(step) {
  if (step.say) return ` — ${step.say}`
  if (step.verb === 'rename') return ` → ${step.to}`
  if (step.verb === 'purge') return ' — hors liste, porté par personne'
  if (step.label) return ` — #${step.label.color} · ${step.label.description}`
  return ''
}

function gh(args) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8' }).trim()
  } catch (error) {
    fail(args, error)
  }
}

function api(args) {
  const [method, ...rest] = args
  const out = gh([
    'api',
    '-X',
    method,
    ...rest,
    '--header',
    'Accept: application/vnd.github+json',
  ])
  if (out === '') return []

  // `--paginate` concatène les pages : chaque page est un tableau JSON.
  return out
    .split('\n')
    .filter((line) => line !== '')
    .flatMap((line) => {
      const parsed = JSON.parse(line)
      return Array.isArray(parsed) ? parsed : [parsed]
    })
}

function fail(args, error) {
  const said = String(error.stderr ?? error.message)

  if (/HTTP 401/.test(said)) {
    console.error(
      'Le jeton n’est pas accepté. Le jeton d’une session sert souvent à git seul :\n' +
        'il porte alors `contents`, et l’API des labels demande `issues`.\n' +
        'Vérifie avec `gh auth status`, et relance après `gh auth refresh -s repo`.',
    )
  } else if (/HTTP 403/.test(said)) {
    console.error(
      'Le jeton est accepté mais n’a pas le droit d’écrire les labels — il lui\n' +
        'manque `issues` sur ce dépôt. Ce n’est pas une limite de débit : c’est une\n' +
        'portée. `gh auth refresh -s repo` la donne.',
    )
  } else if (/executable file not found|ENOENT/.test(said)) {
    console.error(
      '`gh` est introuvable. Ce script parle à GitHub par lui, jamais en direct.',
    )
  } else {
    console.error(said.trim())
  }

  console.error(`\ncommande : gh ${args.join(' ')}`)
  process.exit(1)
}
