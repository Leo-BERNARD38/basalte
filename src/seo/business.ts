// Les faits de l’entreprise : raison sociale, adresse, téléphone, horaires.
//
// D101 les avait laissés en prose, et pour une bonne raison : ils n’avaient
// qu’un lecteur — la page qui les affiche —, que le client gère déjà. Ils en
// ont maintenant un second, le JSON-LD, qui ne sait pas lire de la prose. Pour
// un artisan ou un commerce, cette fiche pèse plus lourd dans le référencement
// que tout le reste de la phase réuni.
//
// Ce fichier est pur : il déclare des champs et rien d’autre. Le panel le lit
// dans un navigateur, où rien de `node:` n’a sa place — la lecture du fichier
// vit dans `src/content/business.ts`, comme celle du chrome.

import { f } from '../fields/define.js'
import type { Values } from '../fields/types.js'

/** Le nom sous lequel l’écran d’édition range la fiche dans sa liste. */
export const BUSINESS_ENTRY = 'business'
export const BUSINESS_TITLE = 'Fiche de l’entreprise'

// Les valeurs sont les types de schema.org, les libellés sont ceux du client
// (D25) : c’est lui qui choisit, ce n’est pas lui qui apprend le vocabulaire.
const KINDS = [
  { value: 'LocalBusiness', label: 'Commerce ou service de proximité' },
  { value: 'HomeAndConstructionBusiness', label: 'Artisan du bâtiment' },
  { value: 'Store', label: 'Boutique' },
  { value: 'Restaurant', label: 'Restaurant, café ou bar' },
  { value: 'ProfessionalService', label: 'Profession libérale' },
]

const DAYS = [
  { value: 'Monday', label: 'Lundi' },
  { value: 'Tuesday', label: 'Mardi' },
  { value: 'Wednesday', label: 'Mercredi' },
  { value: 'Thursday', label: 'Jeudi' },
  { value: 'Friday', label: 'Vendredi' },
  { value: 'Saturday', label: 'Samedi' },
  { value: 'Sunday', label: 'Dimanche' },
]

// Rien n’est traduisible : une adresse et un numéro de téléphone ne changent
// pas de langue, et une raison sociale non plus.
export const BUSINESS_FIELDS = {
  legalName: f.text({
    label: 'Raison sociale',
    help: 'Le nom légal de l’entreprise, tel qu’il figure sur un devis.',
    max: 120,
  }),
  kind: f.select({
    label: 'Type d’activité',
    help: 'Ce que Google affiche à côté du nom dans ses résultats.',
    options: KINDS,
  }),
  address: f.group({
    label: 'Adresse',
    fields: {
      street: f.text({ label: 'Rue', max: 120 }),
      postalCode: f.text({ label: 'Code postal', max: 12 }),
      city: f.text({ label: 'Ville', max: 80 }),
      country: f.text({ label: 'Pays', max: 60 }),
    },
  }),
  phone: f.text({ label: 'Téléphone', max: 30 }),
  email: f.text({ label: 'Adresse email', max: 120 }),
  area: f.text({
    label: 'Zone desservie',
    help: 'La ville ou la région où l’entreprise intervient.',
    max: 120,
  }),
  hours: f.list({
    label: 'Horaires',
    help: 'Une ligne par jour ouvré. Laisse vide si les horaires varient.',
    of: {
      day: f.select({ label: 'Jour', options: DAYS }),
      opens: f.text({ label: 'Ouverture', help: 'Par exemple 09:00', max: 5 }),
      closes: f.text({ label: 'Fermeture', help: 'Par exemple 18:00', max: 5 }),
    },
    itemLabel: 'day',
  }),
}

export type BusinessFacts = Values<typeof BUSINESS_FIELDS>

/**
 * Le libellé français d’un jour, tel que le client l’a choisi dans la liste.
 * Un bloc qui affiche les horaires le lit ici : réécrire les sept noms dans
 * son composant les ferait diverger de la liste déroulante du panel.
 */
export function dayLabel(value: string): string {
  return DAYS.find((day) => day.value === value)?.label ?? value
}

/** Une fiche vide n’émet aucune donnée structurée : rien à dire, rien à écrire. */
export function hasBusiness(facts: BusinessFacts): boolean {
  return facts.legalName.trim() !== ''
}

/** L’adresse postale est complète ou elle n’est pas : une rue seule ne situe rien. */
export function hasAddress(facts: BusinessFacts): boolean {
  return (
    facts.address.street.trim() !== '' &&
    facts.address.city.trim() !== '' &&
    facts.address.postalCode.trim() !== ''
  )
}
