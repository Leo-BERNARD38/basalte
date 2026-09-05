import { COMMANDS } from './commands.js'

export type Result = {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

export async function run(
  argv: readonly string[],
  version: string,
  cwd: string = process.cwd(),
): Promise<Result> {
  const first = argv[0]

  if (first === undefined || first === '--help' || first === '-h') {
    return { code: 0, stdout: help(), stderr: '' }
  }

  if (first === '--version' || first === '-v') {
    return { code: 0, stdout: `${version}\n`, stderr: '' }
  }

  const command = COMMANDS.find((candidate) => candidate.name === first)

  if (command === undefined) {
    return {
      code: 1,
      stdout: '',
      stderr:
        `Commande inconnue : « ${first} ».\n` +
        'Lance « basalte --help » pour la liste des commandes.\n',
    }
  }

  if (command.run === undefined) {
    return {
      code: 1,
      stdout: '',
      stderr:
        `La commande « ${command.name} » n’est pas encore implémentée.\n` +
        'Voir les issues du dépôt pour celle qui la porte.\n',
    }
  }

  try {
    return await command.run(argv.slice(1), cwd)
  } catch (cause) {
    return { code: 1, stdout: '', stderr: `${(cause as Error).message}\n` }
  }
}

function help(): string {
  const options = [
    ['-h, --help', 'affiche cette aide'],
    ['-v, --version', 'affiche la version'],
  ] as const

  const width = Math.max(
    ...COMMANDS.map((command) => command.usage.length),
    ...options.map(([flags]) => flags.length),
  )

  return [
    'basalte — socle technique pour landing pages éditables',
    '',
    'Usage : basalte <commande> [options]',
    '',
    'Commandes :',
    ...COMMANDS.map(
      (command) => `  ${command.usage.padEnd(width)}  ${command.summary}`,
    ),
    '',
    'Options :',
    ...options.map(
      ([flags, summary]) => `  ${flags.padEnd(width)}  ${summary}`,
    ),
    '',
  ].join('\n')
}
