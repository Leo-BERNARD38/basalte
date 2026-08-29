// Le module que l’intégration génère au démarrage. Sa forme est décrite ici
// pour que les composants du socle et ceux d’un dépôt client soient
// typecheckés comme le reste.

declare module 'virtual:basalte' {
  import type { MediaManifest, RenderedPage, Site } from '@leobernard/basalte'

  export const site: Site
  export const pages: readonly RenderedPage[]
  export const media: MediaManifest
  export const blocks: Readonly<
    Record<string, (props: Record<string, unknown>) => unknown>
  >
}
