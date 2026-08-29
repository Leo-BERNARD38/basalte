// Ce qui exécute une commande sur la machine. Le socle ne parle jamais
// directement à SSH : il passe par un `Runner`, ce qui laisse la séquence de
// mise en production s’éprouver entièrement sans VPS, et `--dry-run` la
// dérouler sans qu’une seule connexion ne parte.
//
// Le script part en argument et l’entrée standard reste libre : c’est par elle
// que le `.env` traverse, sans jamais devenir un fichier temporaire sur le
// disque de la machine.

import { execFile } from 'node:child_process'

export type Run = {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

export type Runner = (command: string, stdin?: string) => Promise<Run>

export const SSH_TIMEOUT = 15 * 60 * 1000

export function sshRunner(host: string, user = 'root'): Runner {
  return (command, stdin) =>
    new Promise((resolve) => {
      const child = execFile(
        'ssh',
        [
          '-o',
          'BatchMode=yes',
          '-o',
          'StrictHostKeyChecking=accept-new',
          `${user}@${host}`,
          'sh',
          '-c',
          quote(`set -e\n${command}`),
        ],
        { timeout: SSH_TIMEOUT, maxBuffer: 8 * 1024 * 1024 },
        (cause, stdout, stderr) => {
          resolve({
            code: cause === null ? 0 : 1,
            stdout,
            stderr: cause === null ? stderr : `${stderr}${cause.message}`,
          })
        },
      )

      child.stdin?.end(stdin ?? '', 'utf8')
    })
}

/**
 * Un runner qui n’exécute rien et retient ce qu’on lui a demandé : c’est ce que
 * `--dry-run` affiche.
 */
export function dryRunner(recorded: string[]): Runner {
  return (command) => {
    recorded.push(command)

    return Promise.resolve({ code: 0, stdout: '', stderr: '' })
  }
}

/** Un script entier réduit à un seul mot pour le shell distant. */
export function quote(script: string): string {
  return `'${script.replaceAll("'", `'\\''`)}'`
}
