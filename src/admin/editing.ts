// Ce que tout champ a besoin de savoir sans qu’on le lui passe de main en
// main : la langue affichée, celles que le site déclare, la médiathèque, et le
// moyen d’ouvrir le choix d’une image ou d’un document.

import { createContext, useContext } from 'react'

import type { DocumentSummary } from '../server/documents.js'
import type { MediaSummary } from '../server/library.js'
import type { PanelLanguage } from '../server/panel.js'
import { slugFor } from '../astro/routes.js'
import { DEFAULT_SUPPORT, SUPPORT_PARAM } from '../render/supports.js'
import { resolveCapabilities, type Capabilities } from '../site/capabilities.js'

export type Editing = {
  readonly language: string
  readonly languages: readonly PanelLanguage[]
  readonly onLanguage: (language: string) => void
  readonly capabilities: Capabilities
  readonly media: readonly MediaSummary[]
  readonly documents: readonly DocumentSummary[]
  /**
   * Le ratio vient du champ, jamais de la médiathèque : elle ne connaît aucun
   * format attendu, et c’est l’emplacement qui le déclare.
   */
  readonly pickImage: (
    current: string,
    ratio?: string,
  ) => Promise<string | undefined>
  readonly pickDocument: (current: string) => Promise<string | undefined>
}

const EMPTY: Editing = {
  language: '',
  languages: [],
  onLanguage: () => undefined,
  capabilities: resolveCapabilities(),
  media: [],
  documents: [],
  pickImage: async () => undefined,
  pickDocument: async () => undefined,
}

const PREVIEW = '/admin/preview/'

export const EditingContext = createContext<Editing>(EMPTY)

export function useEditing(): Editing {
  return useContext(EditingContext)
}

/**
 * La phrase qui dit quelle langue on écrit, sur un site qui en a plusieurs.
 * Rien ne la disait : un champ traduisible est identique dans les deux langues,
 * et le seul indice vivait dans un menu, en haut à droite de l’écran.
 */
export function editedLanguage(editing: Editing): string | undefined {
  if (editing.languages.length < 2) return undefined

  return `Vous modifiez le contenu en ${languageLabel(editing.languages, editing.language)}.`
}

/** Le nom d’une langue tel que le client le lit, jamais son code. */
export function languageLabel(
  languages: readonly PanelLanguage[],
  code: string,
): string {
  return languages.find((language) => language.code === code)?.label ?? code
}

/**
 * L’adresse de l’aperçu : la route de la page, préfixée si la langue n’est pas
 * celle par défaut, et le support demandé.
 */
export function previewAddress(
  route: string,
  editing: {
    readonly language: string
    readonly languages: readonly {
      readonly code: string
      readonly default?: boolean
    }[]
  },
  support: string,
): string {
  const fallback = editing.languages.find((entry) => entry.default)?.code ?? ''
  const prefix = editing.language === fallback ? '' : editing.language
  const asked =
    support === DEFAULT_SUPPORT ? '' : `?${SUPPORT_PARAM}=${support}`

  return `${PREVIEW}${slugFor(route, prefix) ?? ''}${asked}`
}
