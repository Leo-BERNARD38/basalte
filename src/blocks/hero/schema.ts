import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'hero',
  label: 'Bandeau principal',
  help: 'La première chose que voit un visiteur : ce que c’est, pour qui, quoi faire.',
  fields: {
    title: f.text({
      label: 'Titre',
      i18n: true,
      required: true,
      max: 80,
    }),
    subtitle: f.textarea({
      label: 'Sous-titre',
      i18n: true,
      max: 200,
      rows: 3,
    }),
    image: f.image({
      label: 'Image',
      ratio: '16/9',
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
