import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'team',
  label: 'L’équipe',
  help: 'Les personnes derrière l’entreprise : un visage vaut une page de présentation.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    intro: f.textarea({
      label: 'Texte d’introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    items: f.list({
      label: 'Personnes',
      itemLabel: 'name',
      required: true,
      min: 1,
      of: {
        image: f.image({
          label: 'Portrait',
          ratio: '1/1',
        }),
        name: f.text({ label: 'Nom', required: true, max: 60 }),
        role: f.text({ label: 'Fonction', i18n: true, max: 80 }),
        body: f.textarea({
          label: 'Quelques mots',
          i18n: true,
          max: 220,
          rows: 3,
        }),
      },
    }),
  },
})
