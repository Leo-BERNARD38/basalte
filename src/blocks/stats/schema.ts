import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'stats',
  label: 'Chiffres clés',
  help: 'Deux à quatre nombres qui rassurent. L’unité fait partie de la valeur : « 12 ans », « +150 ».',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    items: f.list({
      label: 'Chiffres',
      itemLabel: 'label',
      required: true,
      min: 2,
      of: {
        value: f.text({
          label: 'Le chiffre',
          i18n: true,
          required: true,
          max: 12,
        }),
        label: f.text({
          label: 'Ce qu’il compte',
          i18n: true,
          required: true,
          max: 40,
        }),
      },
    }),
  },
})
