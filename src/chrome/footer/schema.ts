import { f } from '../../fields/define.js'
import { block } from '../../blocks/define.js'

export default block({
  name: 'footer',
  label: 'Pied de page',
  help: 'Le bas de chaque page : les liens légaux, et la mention de propriété.',
  fields: {
    links: f.list({
      label: 'Liens',
      itemLabel: 'label',
      of: {
        label: f.text({
          label: 'Intitulé',
          i18n: true,
          required: true,
          max: 40,
        }),
        href: f.url({ label: 'Destination', required: true }),
      },
    }),
  },
})
