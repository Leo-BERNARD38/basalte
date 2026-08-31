import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'gallery',
  label: 'Galerie',
  help: 'Plusieurs images côte à côte, servies à la taille de l’écran.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    images: f.list({
      label: 'Images',
      itemLabel: 'caption',
      required: true,
      min: 1,
      of: {
        image: f.image({ label: 'Image', required: true, ratio: '4/3' }),
        caption: f.text({ label: 'Légende', i18n: true, max: 120 }),
      },
    }),
  },
})
