import { f } from '../../fields/define.js'
import { block } from '../../blocks/define.js'

export default block({
  name: 'header',
  label: 'En-tête',
  help: 'La barre du haut : le nom du site, ou son logo, et le menu.',
  fields: {
    logo: f.image({
      label: 'Logo',
      help: 'Laissé vide, le nom du site s’affiche en toutes lettres.',
    }),
    links: f.list({
      label: 'Liens du menu',
      help: 'Laissée vide, la liste reprend les pages du site.',
      itemLabel: 'label',
      // La seule borne haute du socle. Le menu est une rangée qui ne se replie
      // pas : au-delà, elle déborde de la largeur de contenu et toute la page
      // défile en travers.
      max: 6,
      of: {
        label: f.text({
          label: 'Intitulé',
          i18n: true,
          required: true,
          max: 24,
        }),
        href: f.url({ label: 'Destination', required: true }),
      },
    }),
    menuLabel: f.text({
      label: 'Bouton du menu',
      help: 'Le mot qui ouvre le menu sur téléphone. Vide, c’est « Menu ».',
      i18n: true,
      max: 16,
    }),
  },
})
