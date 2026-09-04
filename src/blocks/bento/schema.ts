import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'bento',
  label: 'Grille de cartes',
  help: 'Des cartes de tailles inégales : chacune décide de la place qu’elle prend.',
  fields: {
    title: f.text({
      label: 'Titre de la section',
      i18n: true,
      max: 80,
    }),
    intro: f.textarea({
      label: 'Introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    items: f.list({
      label: 'Cartes',
      itemLabel: 'title',
      required: true,
      min: 3,
      of: {
        title: f.text({
          label: 'Titre',
          i18n: true,
          required: true,
          max: 60,
        }),
        body: f.textarea({
          label: 'Texte',
          i18n: true,
          max: 180,
          rows: 3,
        }),
        image: f.image({
          label: 'Image',
          ratio: '16/9',
        }),
        size: f.select({
          label: 'Largeur',
          options: [
            { value: 'normal', label: 'Normale' },
            { value: 'large', label: 'Large' },
          ],
        }),
      },
    }),
  },
})
