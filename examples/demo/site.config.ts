import { defineSite } from '@leobernard/basalte'

export default defineSite({
  name: 'Atelier Démonstration',
  domain: 'demo.basalte.test',
  languages: {
    fr: { default: true },
    en: { draft: true },
  },
  capabilities: {
    documents: true,
  },
  tokens: {
    color: {
      bg: '#ffffff',
      fg: '#101014',
      muted: '#5c5c64',
      accent: '#16181d',
      accentFg: '#ffffff',
      border: '#e6e8ee',
    },
  },
})
