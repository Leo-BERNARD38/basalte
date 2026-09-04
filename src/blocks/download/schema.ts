import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'download',
  label: 'Document à télécharger',
  help: 'Le seul bloc qui sert un fichier plutôt qu’une page. Le document se télécharge, il ne s’affiche jamais.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    description: f.textarea({
      label: 'Ce que contient le document',
      i18n: true,
      max: 300,
      rows: 2,
    }),
    file: f.document({
      label: 'Le document',
      required: true,
    }),
    label: f.text({
      label: 'Libellé du bouton',
      i18n: true,
      max: 40,
    }),
  },
})
