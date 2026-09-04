import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'contact',
  label: 'Formulaire de contact',
  help: 'Les messages arrivent par email et se retrouvent dans « Messages ».',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    intro: f.textarea({
      label: 'Texte d’introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    labels: f.group({
      label: 'Libellés du formulaire',
      fields: {
        name: f.text({ label: 'Champ « nom »', i18n: true, max: 40 }),
        email: f.text({ label: 'Champ « email »', i18n: true, max: 40 }),
        message: f.text({ label: 'Champ « message »', i18n: true, max: 40 }),
        submit: f.text({ label: 'Bouton d’envoi', i18n: true, max: 40 }),
      },
    }),
    answers: f.group({
      label: 'Réponses au visiteur',
      fields: {
        sent: f.textarea({
          label: 'Message reçu',
          i18n: true,
          max: 200,
          rows: 2,
        }),
        refused: f.textarea({
          label: 'Envoi refusé',
          i18n: true,
          max: 200,
          rows: 2,
        }),
        waiting: f.textarea({
          label: 'Trop d’envois',
          i18n: true,
          max: 200,
          rows: 2,
        }),
      },
    }),
    consent: f.richtext({
      label: 'Mention de consentement',
      i18n: true,
      max: 300,
    }),
  },
})
