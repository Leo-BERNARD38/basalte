// La carte qu’affiche une messagerie quand le lien d’une page y est collé.
//
// Sans une seule balise `og:`, un lien partagé n’est qu’une adresse : ni titre,
// ni image, ni phrase. C’est le premier contact avec le site, et le socle le
// promettait depuis le début sans le tenir.
//
// L’image se choisit par page, et retombe sur la première image de la page
// quand personne n’en a choisi (D124) : la carte d’une page de contact ne doit
// pas montrer le bandeau de l’accueil.

import type { BlockRegistry } from '../blocks/define.js'
import type { PageBlock, PageMeta } from '../content/page.js'
import { walkValues } from '../fields/walk.js'
import type { Site } from '../site/define.js'

export type MetaTag = {
  /** Open Graph s’écrit en `property`, les cartes Twitter en `name`. */
  readonly property?: string
  readonly name?: string
  readonly content: string
}

export type ShareImage = {
  /** Absolue : une messagerie ne résout pas un chemin relatif. */
  readonly src: string
  readonly width: number
  readonly height: number
  readonly alt: string
}

/**
 * La clé de l’image de partage : celle que la page déclare, sinon la première
 * que porte une de ses sections visibles.
 */
export function shareImageKey(input: {
  readonly meta: PageMeta
  readonly registry: BlockRegistry
  readonly sections: readonly PageBlock[]
}): string {
  const chosen = input.meta.image.trim()

  if (chosen !== '') return chosen

  for (const section of input.sections) {
    const definition = input.registry[section.type]

    if (definition === undefined) continue

    let found = ''

    walkValues(definition.fields, section.props, (field, value) => {
      if (found !== '' || field.kind !== 'image') return

      const key = typeof value === 'string' ? value.trim() : ''

      if (key !== '') found = key
    })

    if (found !== '') return found
  }

  return ''
}

export function shareTags(input: {
  readonly site: Site
  readonly title: string
  readonly description: string
  readonly url: string
  readonly language: string
  readonly image?: ShareImage
}): readonly MetaTag[] {
  const tags: MetaTag[] = [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: input.site.name },
    { property: 'og:title', content: input.title },
    { property: 'og:url', content: input.url },
    { property: 'og:locale', content: input.language.replace('-', '_') },
  ]

  if (input.description !== '') {
    tags.push({ property: 'og:description', content: input.description })
  }

  if (input.image !== undefined) {
    tags.push(
      { property: 'og:image', content: input.image.src },
      { property: 'og:image:width', content: String(input.image.width) },
      { property: 'og:image:height', content: String(input.image.height) },
    )

    if (input.image.alt !== '') {
      tags.push({ property: 'og:image:alt', content: input.image.alt })
    }
  }

  // Une carte large sans image tombe sur un cadre vide : le petit format est
  // le bon quand il n’y a rien à montrer.
  tags.push({
    name: 'twitter:card',
    content: input.image === undefined ? 'summary' : 'summary_large_image',
  })

  return tags
}
