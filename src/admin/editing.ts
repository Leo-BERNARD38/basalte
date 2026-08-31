// Ce que tout champ a besoin de savoir sans qu’on le lui passe de main en
// main : la langue affichée, celles que le site déclare, la médiathèque, et le
// moyen d’ouvrir le choix d’une image ou d’un document.

import { createContext, useContext } from 'react'

import type { DocumentSummary } from '../server/documents.js'
import type { MediaSummary } from '../server/library.js'
import type { PanelLanguage } from '../server/panel.js'
import { resolveCapabilities, type Capabilities } from '../site/capabilities.js'

export type Editing = {
  readonly language: string
  readonly languages: readonly PanelLanguage[]
  readonly capabilities: Capabilities
  readonly media: readonly MediaSummary[]
  readonly documents: readonly DocumentSummary[]
  readonly pickImage: (current: string) => Promise<string | undefined>
  readonly pickDocument: (current: string) => Promise<string | undefined>
}

const EMPTY: Editing = {
  language: '',
  languages: [],
  capabilities: resolveCapabilities(),
  media: [],
  documents: [],
  pickImage: async () => undefined,
  pickDocument: async () => undefined,
}

export const EditingContext = createContext<Editing>(EMPTY)

export function useEditing(): Editing {
  return useContext(EditingContext)
}

/** Le nom d’une langue tel que le client le lit, jamais son code. */
export function languageLabel(
  languages: readonly PanelLanguage[],
  code: string,
): string {
  return languages.find((language) => language.code === code)?.label ?? code
}
