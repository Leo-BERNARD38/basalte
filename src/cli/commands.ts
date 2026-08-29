export type Command = {
  /** Nom tapé par l'utilisateur. */
  readonly name: string
  /** Nom suivi de ses arguments, tel que `--help` l'affiche. */
  readonly usage: string
  readonly summary: string
}

export const COMMANDS: readonly Command[] = [
  {
    name: 'init',
    usage: 'init <nom>',
    summary: 'génère un dépôt client complet',
  },
  {
    name: 'check',
    usage: 'check',
    summary: 'valide les contenus contre les schémas, puis construit',
  },
  {
    name: 'inventory',
    usage: 'inventory',
    summary: 'liste blocs, champs et helpers réutilisables',
  },
  {
    name: 'update',
    usage: 'update',
    summary: 'monte un site de version, ou annule tout',
  },
  {
    name: 'deploy',
    usage: 'deploy --host <ip>',
    summary: 'provisionne le VPS, ou le met à jour',
  },
  {
    name: 'doctor',
    usage: 'doctor',
    summary: 'prouve que la configuration fonctionne',
  },
  {
    name: 'migrate',
    usage: 'migrate',
    summary: 'applique les migrations de format',
  },
  {
    name: 'admin:login',
    usage: 'admin:login --user <email>',
    summary: 'lien de connexion de secours (SSH)',
  },
  {
    name: 'update-all',
    usage: 'update-all <liste>',
    summary: 'monte de version une liste de sites',
  },
]
