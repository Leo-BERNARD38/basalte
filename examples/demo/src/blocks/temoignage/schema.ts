import { block, f } from '@leobernard/basalte'

export default block({
  name: 'temoignage',
  label: 'Témoignage',
  fields: {
    quote: f.textarea({
      label: 'Ce que dit la personne',
      i18n: true,
      required: true,
      max: 240,
      rows: 3,
    }),
    author: f.text({ label: 'Qui parle', required: true, max: 60 }),
  },
})
