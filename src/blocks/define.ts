// La définition d’un bloc. Un dossier, deux fichiers : ce `schema.ts` et le
// composant `.astro` du même nom. Aucun registre central à éditer — le socle
// et le dépôt client sont parcourus (invariant 7).

import type { Fields, Values } from '../fields/types.js'
import type { ResolvedDocument, ResolvedImage } from '../media/resolve.js'

export type BlockDefinition<S extends Fields = Fields> = {
  /** Le type écrit dans le JSON de contenu, et le nom du dossier. */
  readonly name: string
  /** Ce que le client lit dans le panel. */
  readonly label: string
  readonly help?: string
  readonly fields: S
}

export type BlockRegistry = Readonly<Record<string, BlockDefinition>>

// Ce que reçoit le composant d’un bloc. Les valeurs restent séparées du reste :
// un bloc peut avoir un champ nommé « language » ou « image ».
export type BlockProps<S extends Fields> = {
  readonly props: Values<S>
  readonly language: string
  readonly image: ImageResolver
  readonly document: DocumentResolver
}

// Une clé de média devient ce qu’un `img` attend. Le `sizes` appartient au
// bloc : lui seul sait la largeur qu’il donne à son image.
export type ImageResolver = (
  key: string,
  sizes?: string,
) => ResolvedImage | undefined

/** Une clé de document devient un lien de téléchargement, jamais un rendu. */
export type DocumentResolver = (key: string) => ResolvedDocument | undefined

const NAME = /^[a-z][a-z0-9-]*$/

export function block<const S extends Fields>(
  definition: BlockDefinition<S>,
): BlockDefinition<S> {
  if (!NAME.test(definition.name)) {
    throw new Error(
      `« ${definition.name} » n’est pas un nom de bloc : minuscules, chiffres et tirets, à l’image du dossier qui le porte.`,
    )
  }

  if (definition.label.trim() === '') {
    throw new Error(
      `Le bloc « ${definition.name} » doit porter un libellé : c’est ce que le client lit dans le panel.`,
    )
  }

  return definition
}
