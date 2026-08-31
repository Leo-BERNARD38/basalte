// Le module que l’intégration génère au démarrage. Sa forme est décrite ici
// pour que les composants du socle et ceux d’un dépôt client soient
// typecheckés comme le reste.

declare module 'virtual:basalte' {
  import type {
    BlockRegistry,
    BusinessFacts,
    ChromeContent,
    DocumentManifest,
    MediaManifest,
    Post,
    RenderedPage,
    Site,
    StructuredBuilders,
  } from '@leobernard/basalte'

  export const root: string
  export const site: Site
  /** Vrai sous `astro dev` : le panel y sert à écrire, jamais à mettre en ligne. */
  export const dev: boolean
  export const registry: BlockRegistry
  export const pages: readonly RenderedPage[]
  /** Les billets du journal, du plus récent au plus ancien. Vide sans journal. */
  export const posts: readonly Post[]
  export const media: MediaManifest
  export const documents: DocumentManifest
  export const blocks: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  /** Les variantes bureau, pour les seuls blocs qui en portent une. */
  export const desktop: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  /** L’en-tête et le pied de page, du socle ou remplacés par le dépôt. */
  export const chrome: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  export const chromeDesktop: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  export const chromeRegistry: BlockRegistry
  export const chromeContent: ChromeContent
  /** Le gabarit du billet, du socle ou remplacé par le dépôt. */
  export const journalBlocks: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  export const journalDesktop: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
  export const journalRegistry: BlockRegistry
  /** Les faits de l’entreprise, d’où sortent les données structurées locales. */
  export const business: BusinessFacts
  /** Ce que chaque bloc apporte au JSON-LD de sa page, pour ceux qui en portent. */
  export const structured: StructuredBuilders
}
