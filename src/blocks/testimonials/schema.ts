import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'testimonials',
  label: 'Témoignages',
  help: 'Ce que des clients ont dit, avec leur nom : la section qui rassure le plus.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    items: f.list({
      label: 'Témoignages',
      itemLabel: 'author',
      required: true,
      min: 1,
      of: {
        quote: f.textarea({
          label: 'Ce que dit la personne',
          i18n: true,
          required: true,
          max: 280,
          rows: 4,
        }),
        author: f.text({ label: 'Qui parle', required: true, max: 60 }),
        role: f.text({
          label: 'Sa fonction, ou sa ville',
          i18n: true,
          max: 80,
        }),
        image: f.image({
          label: 'Portrait',
          help: 'Facultatif. Le texte alternatif se règle dans la médiathèque.',
          ratio: '1/1',
        }),
      },
    }),
  },
})
