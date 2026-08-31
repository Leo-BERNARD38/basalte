import { f } from '../../fields/define.js'
import { block } from '../define.js'

export default block({
  name: 'journal',
  label: 'Actualités',
  help: 'La liste des billets du journal. Elle se remplit toute seule.',
  fields: {
    title: f.text({ label: 'Titre de la section', i18n: true, max: 80 }),
    // Vide, la section porte tout le journal, groupé par année. C’est ce qui
    // fait qu’un même bloc sert la page d’index et l’accueil : trois sur
    // l’accueil, tout sur l’index.
    limit: f.select({
      label: 'Nombre de billets',
      help: 'Vide, la section les porte tous, groupés par année.',
      options: [
        { value: '3', label: 'Les 3 derniers' },
        { value: '6', label: 'Les 6 derniers' },
        { value: '12', label: 'Les 12 derniers' },
      ],
    }),
    empty: f.text({
      label: 'Quand il n’y a rien',
      help: 'La phrase affichée tant qu’aucun billet n’est en ligne.',
      i18n: true,
      max: 120,
    }),
    more: f.group({
      label: 'Lien vers tout le journal',
      fields: {
        label: f.text({ label: 'Intitulé', i18n: true, max: 40 }),
        href: f.url({ label: 'Adresse' }),
      },
    }),
  },
})
