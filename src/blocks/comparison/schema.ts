import { f } from '../../fields/define.js'
import { block } from '../define.js'

/** Ce qu’une colonne annonce : son nom, et la phrase qui le précise. */
const column = {
  name: f.text({ label: 'Nom', i18n: true, required: true, max: 40 }),
  note: f.text({ label: 'Précision', i18n: true, max: 60 }),
}

export default block({
  name: 'comparison',
  label: 'Tableau comparatif',
  help: 'Deux colonnes nommées, et les lignes qui les séparent.',
  fields: {
    title: f.text({
      label: 'Titre de la section',
      i18n: true,
      max: 80,
    }),
    intro: f.textarea({
      label: 'Introduction',
      i18n: true,
      max: 300,
      rows: 3,
    }),
    left: f.group({
      label: 'Première colonne',
      fields: column,
    }),
    right: f.group({
      label: 'Seconde colonne',
      fields: column,
    }),
    rows: f.list({
      label: 'Lignes',
      itemLabel: 'label',
      required: true,
      min: 2,
      of: {
        label: f.text({
          label: 'Ce qui est comparé',
          i18n: true,
          required: true,
          max: 60,
        }),
        left: f.text({
          label: 'Première colonne',
          i18n: true,
          max: 60,
        }),
        right: f.text({
          label: 'Seconde colonne',
          i18n: true,
          max: 60,
        }),
      },
    }),
  },
})
