import type { Result } from './run.js'

export type Command = {
  /** Nom tapé par l’utilisateur. */
  readonly name: string
  /** Nom suivi de ses arguments, tel que `--help` l’affiche. */
  readonly usage: string
  readonly summary: string
  /**
   * Absent tant que la commande n’est pas implémentée. Le module qui la porte
   * est chargé à l’appel : `basalte --help` ne charge ni sharp ni Astro.
   */
  readonly run?: (argv: readonly string[], cwd: string) => Promise<Result>
}

export const COMMANDS: readonly Command[] = [
  {
    name: 'init',
    usage: 'init <nom> [--profile <nom>]',
    summary: 'génère un dépôt client complet',
    run: async (argv, cwd) => (await import('./init.js')).init(argv, cwd),
  },
  {
    name: 'check',
    usage: 'check [--build]',
    summary:
      'valide les contenus contre les schémas, et construit sous --build',
    run: async (argv, cwd) => (await import('./check.js')).check(argv, cwd),
  },
  {
    name: 'inventory',
    usage: 'inventory [--json|--agent]',
    summary: 'liste blocs et champs, ou régénère .claude/basalte.md',
    run: async (argv, cwd) =>
      (await import('./inventory.js')).inventory(argv, cwd),
  },
  {
    name: 'update',
    usage: 'update [--dry-run] [--json]',
    summary: 'monte un site de version, ou annule tout',
    run: async (argv, cwd) => (await import('./update.js')).update(argv, cwd),
  },
  {
    name: 'deploy',
    usage: 'deploy --host <ip> [--dry-run]',
    summary: 'provisionne le VPS, ou le met à jour',
    run: async (argv, cwd) => (await import('./deploy.js')).deploy(argv, cwd),
  },
  {
    name: 'doctor',
    usage: 'doctor [--host <ip>] [--no-email]',
    summary: 'prouve que la configuration fonctionne',
    run: async (argv, cwd) => (await import('./doctor.js')).doctor(argv, cwd),
  },
  {
    name: 'migrate',
    usage: 'migrate [--dry-run]',
    summary: 'applique les migrations de format',
    run: async (argv, cwd) => (await import('./migrate.js')).migrate(argv, cwd),
  },
  {
    name: 'admin:login',
    usage: 'admin:login --user <email> [--create]',
    summary: 'lien de connexion de secours (SSH), et création du compte',
    run: async (argv, cwd) =>
      (await import('./admin-login.js')).adminLogin(argv, cwd),
  },
  {
    name: 'update-all',
    usage: 'update-all <liste>',
    summary: 'monte de version une liste de sites',
    run: async (argv, cwd) =>
      (await import('./update-all.js')).updateAll(argv, cwd),
  },
]
