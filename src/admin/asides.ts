// Les entrées du sélecteur de page qui ne sont pas des pages.
//
// L’en-tête et le pied de page en sont deux depuis la phase 9 ; la fiche
// d’entreprise en est une troisième. Toutes trois portent du contenu validé
// contre des schémas, sans route, sans métadonnées et sans sections qu’on
// ajoute — elles s’éditent donc dans l’écran « Édition », qui sait déjà les
// afficher, plutôt que dans un sixième écran que D63 refuse.
//
// Les nommer ici plutôt qu’en les testant une par une évite ce que la phase 9
// avait laissé : une condition sur le chrome dans huit endroits, qu’une
// quatrième entrée aurait doublée.

import { CHROME_ENTRY, CHROME_TITLE } from '../chrome/define.js'
import type { PageBlock } from '../content/page.js'
import { BUSINESS_ENTRY, BUSINESS_TITLE } from '../seo/business.js'
import type { PanelBlockType, PanelPayload } from '../server/panel.js'
import { saveBusiness, saveChrome, type Answer } from './api.js'
import type { Draft } from './draft.js'

export type Aside = {
  readonly entry: string
  readonly title: string
  /** Un descripteur par section, comme la bibliothèque en porte un par bloc. */
  readonly types: readonly PanelBlockType[]
  readonly sections: readonly PageBlock[]
  /** La phrase qui dit au client à quoi sert cette entrée (D25). */
  readonly note: string
  readonly save: (draft: Draft) => Promise<Answer<{ readonly commit: boolean }>>
}

export function asidesOf(payload: PanelPayload): readonly Aside[] {
  return [
    {
      entry: CHROME_ENTRY,
      title: CHROME_TITLE,
      types: payload.chrome.types,
      sections: payload.chrome.draft.sections,
      note: 'L’en-tête et le pied de page sont sur toutes les pages du site.',
      save: saveChrome,
    },
    {
      entry: BUSINESS_ENTRY,
      title: BUSINESS_TITLE,
      types: [payload.business.type],
      sections: payload.business.draft.sections,
      note: 'Ces informations ne s’affichent pas sur le site : elles disent aux moteurs de recherche qui vous êtes et où vous trouver.',
      save: saveBusiness,
    },
  ]
}

export function asideOf(
  payload: PanelPayload,
  selected: string,
): Aside | undefined {
  return asidesOf(payload).find((aside) => aside.entry === selected)
}

export function isAside(selected: string): boolean {
  return selected === CHROME_ENTRY || selected === BUSINESS_ENTRY
}
