import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'richtext',
  label: 'Texte libre',
  help: 'Un bloc de texte avec du gras, de l’italique et des liens.',
  fields: {
    title: f.text({ label: 'Titre', i18n: true, max: 80 }),
    body: f.richtext({
      label: 'Texte',
      help: '**gras**, *italique*, [libellé](https://…). Le reste s’affiche tel quel.',
      i18n: true,
      required: true,
      max: 4000,
    }),
  },
})
