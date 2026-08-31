// Le gabarit d’un billet. Il porte les champs du journal — déclarés une seule
// fois, dans `src/journal/define.ts` — parce que le formulaire du panel, la
// validation et ce composant doivent lire la même liste.
//
// Ce n’est pas un bloc de la bibliothèque : on ne l’ajoute pas à une page, il
// habille ce que le formulaire a rempli. Il est parcouru comme le chrome, et
// un dépôt client le remplace dossier pour dossier (D109).

import { block } from '../../blocks/define.js'
import { pick } from '../../fields/translate.js'
import { POST_FIELDS, POST_SLOT } from '../define.js'

export default block({
  name: POST_SLOT,
  label: 'Billet',
  fields: POST_FIELDS,

  // `BlogPosting` est le seul balisage que Google lit encore pour un article
  // de journal d’entreprise. L’auteur désigne le nœud de l’entreprise plutôt
  // que de le recopier : il est déjà posé sur cette page, et deux
  // descriptions de la même société se contrediraient (D149).
  structured(props, context) {
    const headline = pick(props.title, context.language).trim()

    if (headline === '' || props.date === '') return undefined

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline,
      datePublished: props.date,
      mainEntityOfPage: context.url,
      author: { '@id': `${context.origin}/#entreprise` },
      ...(pick(props.excerpt, context.language).trim() === ''
        ? {}
        : { description: pick(props.excerpt, context.language) }),
    }
  },
})
