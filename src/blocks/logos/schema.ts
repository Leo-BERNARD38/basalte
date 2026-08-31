import { f } from '../../fields/define.js'
import { block } from '../define.js'

// Aucun champ de nom : le texte alternatif d’un logo est le nom de
// l’entreprise, et il vit sur l’entrée de la médiathèque (D140). L’y remettre
// ici serait la même chaîne saisie deux fois.
//
// Aucun ratio déclaré non plus : un logo n’a pas de forme commune, et un
// ratio attendu ferait un avertissement de recadrage sur chaque site.
export default block({
  name: 'logos',
  label: 'Ils nous font confiance',
  help: 'Les marques, clients ou partenaires, alignés sur une rangée.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    items: f.list({
      label: 'Logos',
      required: true,
      min: 1,
      max: 12,
      of: {
        image: f.image({
          label: 'Logo',
          help: 'Le nom de la marque se saisit comme texte alternatif dans la médiathèque.',
          required: true,
        }),
        href: f.url({ label: 'Lien', external: true }),
      },
    }),
  },
})
