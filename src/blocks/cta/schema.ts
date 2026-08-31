import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'cta',
  label: 'Bandeau d’appel',
  help: 'La relance, au milieu ou en fin de page : une phrase et un bouton.',
  fields: {
    title: f.text({
      label: 'Titre',
      i18n: true,
      required: true,
      max: 80,
    }),
    body: f.textarea({
      label: 'Texte',
      i18n: true,
      max: 200,
      rows: 2,
    }),
    cta: f.group({
      label: 'Bouton',
      fields: {
        label: f.text({ label: 'Texte du bouton', i18n: true, max: 30 }),
        href: f.url({ label: 'Lien' }),
      },
    }),
  },
})
