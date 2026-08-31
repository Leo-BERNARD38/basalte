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
export type { Capabilities, CapabilityOverrides } from './site/capabilities.js'

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

export { SLOTS } from './chrome/define.js'
export type {
  ChromeContent,
  ChromeProps,
  ChromeSlot,
  PageEntry,
} from './chrome/define.js'
export { navigationLinks } from './chrome/links.js'
export type { LinkValue, NavigationLink } from './chrome/links.js'

export type { Heading } from './render/outline.js'

export { CONTENT_FORMAT } from './content/page.js'
export type { Page, PageBlock, PageMeta } from './content/page.js'
export type { Project, RenderedPage } from './content/project.js'

export { resolveImage, resolveDocument } from './media/resolve.js'
export type { ResolvedImage, ResolvedDocument } from './media/resolve.js'
export type { MediaEntry, MediaManifest } from './media/manifest.js'
export type { DocumentEntry, DocumentManifest } from './media/documents.js'
export type { DocumentResolver, ImageResolver } from './blocks/define.js'
