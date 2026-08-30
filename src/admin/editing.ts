// Ce que tout champ a besoin de savoir sans qu’on le lui passe de main en
// main : la langue affichée, celles que le site déclare, la médiathèque, et le
// moyen d’ouvrir le choix d’une image.

import { createContext, useContext } from 'react'

import type { MediaSummary } from '../server/library.js'
import type { PanelLanguage } from '../server/panel.js'

export type Editing = {
  readonly language: string
  readonly languages: readonly PanelLanguage[]
  readonly media: readonly MediaSummary[]
  readonly pickImage: (current: string) => Promise<string | undefined>
}

const EMPTY: Editing = {
  language: '',
  languages: [],
  media: [],
  pickImage: async () => undefined,
}

export const EditingContext = createContext<Editing>(EMPTY)

export function useEditing(): Editing {
  return useContext(EditingContext)
}

/** Le nom d’une langue tel que le client le lit, jamais son code. */
const HOME = 'index'

/**
 * Le nom d’une page devant le client. Le titre des moteurs de recherche est
 * une phrase, pas une étiquette : il reste dans son champ, et la navigation
 * emploie le nom du fichier, mis en forme.
 */
export function pageLabel(name: string): string {
  if (name === HOME) return 'Accueil'

  const words = name.replace(/[-_]/g, ' ')

  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function languageLabel(
  languages: readonly PanelLanguage[],
  code: string,
): string {
  return languages.find((language) => language.code === code)?.label ?? code
}
