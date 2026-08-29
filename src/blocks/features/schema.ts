import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'features',
  label: 'Liste de points',
  help: 'Trois à six arguments, chacun avec son titre et sa phrase.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    items: f.list({
      label: 'Points',
      itemLabel: 'title',
      required: true,
      min: 1,
      max: 6,
      of: {
        title: f.text({ label: 'Titre', i18n: true, required: true, max: 60 }),
        body: f.textarea({ label: 'Texte', i18n: true, max: 200, rows: 3 }),
      },
    }),
  },
})
