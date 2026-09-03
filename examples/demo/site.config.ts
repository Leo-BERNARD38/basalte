import { defineSite } from '@leobernard/basalte'

export default defineSite({
  name: 'Basalte',
  domain: 'basalte.test',
  languages: {
    fr: { default: true },
    en: { draft: true },
  },
  capabilities: {
    documents: true,
    desktopRender: true,
  },
  redirects: {
    '/accueil': '/',
    '/atelier': '/fonctionnement',
  },
  journal: {
    base: 'actualites',
    label: 'Actualités',
  },
  panel: {
    seed: '#2f5bea',
  },
  tokens: {
    color: {
      bg: '#ffffff',
      fg: '#0d0d10',
      muted: '#63636d',
      accent: '#2f5bea',
      accentFg: '#ffffff',
      border: '#e5e6ec',
      surface: '#f5f5f7',
      contrast: '#0d0d10',
      contrastFg: '#ffffff',
    },
  },
})
