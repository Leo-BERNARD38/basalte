// Le jeu de langues résolu depuis `site.config.ts`. Tout le reste du socle
// travaille sur cette forme plutôt que sur la déclaration brute : la
// validation, le rendu et le panel ont tous besoin de savoir séparer une
// langue en ligne d’une langue en préparation.

export type LanguageDeclaration = {
  readonly default?: boolean
  readonly draft?: boolean
}

export type Language = {
  readonly code: string
  readonly default: boolean
  readonly draft: boolean
}

export type Languages = {
  readonly all: readonly Language[]
  readonly online: readonly Language[]
  readonly draft: readonly Language[]
  readonly default: Language
  readonly codes: readonly string[]
  readonly onlineCodes: readonly string[]
}

const CODE = /^[a-z]{2}(-[A-Z]{2})?$/

export function resolveLanguages(
  declarations: Readonly<Record<string, LanguageDeclaration>>,
): Languages {
  const all: readonly Language[] = Object.entries(declarations).map(
    ([code, declaration]) => {
      if (!CODE.test(code)) {
        throw new Error(
          `« ${code} » n’est pas un code de langue valide — attendu « fr » ou « fr-FR ».`,
        )
      }

      return {
        code,
        default: declaration.default === true,
        draft: declaration.draft === true,
      }
    },
  )

  if (all.length === 0) {
    throw new Error('Le site doit déclarer au moins une langue.')
  }

  const defaults = all.filter((language) => language.default)
  const fallback = defaults[0]

  if (fallback === undefined) {
    throw new Error(
      'Le site doit déclarer une langue par défaut : ajoute « default: true » sur l’une d’elles.',
    )
  }

  if (defaults.length > 1) {
    throw new Error(
      `Le site ne peut porter qu’une seule langue par défaut ; ${defaults.length} sont déclarées.`,
    )
  }

  if (fallback.draft) {
    throw new Error(
      `La langue par défaut « ${fallback.code} » ne peut pas être en préparation.`,
    )
  }

  return {
    all,
    online: all.filter((language) => !language.draft),
    draft: all.filter((language) => language.draft),
    default: fallback,
    codes: all.map((language) => language.code),
    onlineCodes: all
      .filter((language) => !language.draft)
      .map((language) => language.code),
  }
}
