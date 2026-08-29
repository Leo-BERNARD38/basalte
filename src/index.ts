// Point d’entrée public du package : ce qu’un `site.config.ts` et un
// `src/blocks/*/schema.ts` de dépôt client importent.

export { defineSite } from './site/define.js'
export type { Site, SiteDeclaration } from './site/define.js'
export type {
  Language,
  LanguageDeclaration,
  Languages,
} from './site/languages.js'
export type { Tokens, TokenOverrides } from './site/tokens.js'

export { f } from './fields/define.js'
export { pick } from './fields/translate.js'
export { renderRichtext } from './fields/richtext.js'
export type {
  AnyField,
  Fields,
  Translated,
  Value,
  Values,
} from './fields/types.js'

export { block } from './blocks/define.js'
export type {
  BlockDefinition,
  BlockProps,
  BlockRegistry,
} from './blocks/define.js'

export { CONTENT_FORMAT } from './content/page.js'
export type { Page, PageBlock, PageMeta } from './content/page.js'
export type { Project, RenderedPage } from './content/project.js'

export { resolveImage } from './media/resolve.js'
export type { ResolvedImage } from './media/resolve.js'
export type { MediaEntry, MediaManifest } from './media/manifest.js'
export type { ImageResolver } from './blocks/define.js'
