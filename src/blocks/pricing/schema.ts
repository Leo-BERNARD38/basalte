import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'pricing',
  label: 'Tarifs',
  help: 'Deux à quatre formules, chacune avec son prix et ce qu’elle comprend.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    intro: f.textarea({
      label: 'Texte d’introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    items: f.list({
      label: 'Formules',
      itemLabel: 'name',
      required: true,
      min: 1,
      of: {
        name: f.text({
          label: 'Nom de la formule',
          i18n: true,
          required: true,
          max: 60,
        }),
        price: f.text({
          label: 'Prix',
          help: 'Tel qu’il s’affiche, avec sa devise : « 890 € ».',
          i18n: true,
          required: true,
          max: 24,
        }),
        note: f.text({
          label: 'Précision de prix',
          help: 'Par exemple « à partir de », « par mois », « TTC ».',
          i18n: true,
          max: 60,
        }),
        body: f.richtext({
          label: 'Ce que la formule comprend',
          i18n: true,
          max: 400,
          lists: true,
        }),
        cta: f.group({
          label: 'Bouton',
          fields: {
            label: f.text({ label: 'Texte du bouton', i18n: true, max: 30 }),
            href: f.url({ label: 'Lien' }),
          },
        }),
      },
    }),
  },
})
