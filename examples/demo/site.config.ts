import { defineSite } from '@leobernard/basalte'

export default defineSite({
  name: 'Atelier Démonstration',
  domain: 'demo.basalte.test',
  languages: {
    fr: { default: true },
    en: { draft: true },
  },
  tokens: {
    color: {
      bg: '#fbfaf7',
      fg: '#1b1a17',
      muted: '#585349',
      accent: '#8a4b2a',
      accentFg: '#fbfaf7',
      border: '#e0dbd0',
    },
    font: {
      title: 'Georgia, "Times New Roman", serif',
    },
  },
})
