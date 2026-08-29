// L’appel à npm depuis le socle : `init` installe, `update` réinstalle, et les
// deux annulent proprement quand il échoue.
//
// npm est lancé par son fichier JavaScript quand il se désigne lui-même —
// c’est le cas sous un script npm — et par son nom sinon, à travers le shell
// sous Windows où seul le shim `.cmd` existe. Un seul chemin pour les deux
// systèmes.

import { spawn } from 'node:child_process'

const EXEC_PATH = 'npm_execpath'

export type NpmRun = { readonly ok: boolean; readonly code: number }

/** Lance npm dans le dossier donné, sa sortie allant droit au terminal. */
export function runNpm(cwd: string, args: readonly string[]): Promise<NpmRun> {
  const cli = process.env[EXEC_PATH]

  const child =
    cli === undefined
      ? spawn('npm', [...args], {
          cwd,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        })
      : spawn(process.execPath, [cli, ...args], { cwd, stdio: 'inherit' })

  return new Promise((resolve) => {
    child.on('error', () => {
      resolve({ ok: false, code: 1 })
    })

    child.on('close', (code) => {
      resolve({ ok: code === 0, code: code ?? 1 })
    })
  })
}
