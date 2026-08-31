import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'steps',
  label: 'Étapes',
  help: 'Comment ça se passe, dans l’ordre. Le numéro vient du rang, il ne se saisit pas.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    intro: f.textarea({
      label: 'Texte d’introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    items: f.list({
      label: 'Étapes',
      itemLabel: 'title',
      required: true,
      min: 2,
      max: 6,
      of: {
        title: f.text({ label: 'Titre', i18n: true, required: true, max: 60 }),
        body: f.textarea({ label: 'Texte', i18n: true, max: 220, rows: 3 }),
      },
    }),
  },
})
