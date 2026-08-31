import { f } from '../../fields/define.js'
import { block } from '../define.js'

// Aucun champ de coordonnée ici, et c’est le propos du bloc : l’adresse, le
// téléphone et les horaires vivent une seule fois, dans la fiche de
// l’entreprise, que le composant reçoit en prop (D149).
export default block({
  name: 'contact-details',
  label: 'Coordonnées',
  help: 'Affiche l’adresse, le téléphone et les horaires de la fiche de l’entreprise. Rien à ressaisir.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    intro: f.textarea({
      label: 'Texte d’introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
  },
})
