// Ce qu’un site fait, déclaré dans `site.config.ts` et lu à l’exécution.
//
// C’est la règle qui tient la roadmap : `init` ne décide de rien
// d’irréversible. Trois interrupteurs feraient huit sites ; s’ils bifurquaient
// la génération, il y aurait huit socles à maintenir, et la promesse de D5 —
// « un correctif publié ici atteint un site en changeant un numéro » — ne
// tiendrait plus. Une capacité se lit donc au moment où le comportement se
// joue, et se change après coup en modifiant une ligne.
//
// La liste est fermée, comme celle des tokens : un nom inconnu est refusé au
// chargement plutôt que silencieusement ignoré.

const DEFAULTS = {
  /** Notifier le client par email dès qu’un message arrive. */
  notifyLeads: true,
  /** L’écran « Audience », lu dans les journaux d’accès de Caddy. */
  analytics: true,
  /** Le téléversement de documents PDF, exception à l’invariant 3. */
  documents: false,
}

export type Capabilities = { readonly [Name in keyof typeof DEFAULTS]: boolean }

export type CapabilityOverrides = Partial<Capabilities>

/** Ce que chaque capacité veut dire, pour un rapport lisible. */
export const CAPABILITY_LABELS: Readonly<Record<keyof Capabilities, string>> = {
  notifyLeads: 'notification des messages par email',
  analytics: 'mesure d’audience',
  documents: 'documents PDF téléversables',
}

export function resolveCapabilities(
  overrides: CapabilityOverrides = {},
): Capabilities {
  const resolved: Record<string, boolean> = { ...DEFAULTS }

  for (const [name, value] of Object.entries(overrides)) {
    if (!(name in resolved)) {
      throw new Error(
        `« ${name} » n’est pas une capacité du socle — les capacités sont ${Object.keys(DEFAULTS).join(', ')}.`,
      )
    }

    resolved[name] = value === true
  }

  return resolved as Capabilities
}
