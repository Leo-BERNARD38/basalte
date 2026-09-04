import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'showcase',
  label: 'Mise en avant',
  help: 'Une chose à la fois, expliquée : une image, le texte qui la commente, et de quoi aller plus loin.',
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
      max: 400,
      rows: 4,
    }),
    points: f.list({
      label: 'Points',
      itemLabel: 'label',
      of: {
        label: f.text({
          label: 'Ligne',
          i18n: true,
          required: true,
          max: 80,
        }),
      },
    }),
    image: f.image({
      label: 'Image',
      required: true,
      ratio: '4/3',
    }),
    side: f.select({
      label: 'Côté de l’image',
      options: [
        { value: 'right', label: 'À droite du texte' },
        { value: 'left', label: 'À gauche du texte' },
      ],
    }),
    cta: f.group({
      label: 'Lien',
      fields: {
        label: f.text({ label: 'Intitulé', i18n: true, max: 30 }),
        href: f.url({ label: 'Destination' }),
      },
    }),
  },
})
