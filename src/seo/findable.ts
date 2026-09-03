// Ce qui fait qu’une page est trouvée, et que le lien qui la porte dit quelque
// chose. `check` valide chaque page contre son schéma sans jamais regarder le
// site comme un tout : deux pages peuvent y porter le même titre, une page
// peut se partager sans vignette, et la fiche d’entreprise peut être vide sans
// que rien ne le dise.
//
// Tout se lit sur le contenu, jamais sur le HTML construit : titres,
// descriptions et images de partage sont dans les JSON, et les mesurer après
// le build les mettrait dans la moitié de `check` qui ne rend jamais d’erreur.
//
// Aucun de ces constats n’arrête. Le panel n’enregistre qu’une page à la fois
// et ne verrait donc jamais un doublon ; refuser dans `check` seul ferait
// découvrir le refus à la publication, sur un défaut créé la veille.

import type { BlockRegistry } from '../blocks/define.js'
import type { Page } from '../content/page.js'
import { BUSINESS_NAME } from '../content/business.js'
import { isServiceRoute } from '../content/naming.js'
import { languageName, type ContentIssue } from '../content/report.js'
import { pick } from '../fields/translate.js'
import type { Languages } from '../site/languages.js'
import { hasAddress, hasBusiness, type BusinessFacts } from './business.js'
import { shareImageKey } from './meta.js'

export type FindablePage = {
  readonly name: string
  readonly route: string
  readonly page: Page
}

export type FindableInput = {
  readonly pages: readonly FindablePage[]
  readonly registry: BlockRegistry
  readonly languages: Languages
  readonly business: BusinessFacts
}

export function findableIssues(input: FindableInput): readonly ContentIssue[] {
  return [
    ...duplicates(
      input,
      'title',
      'Titre de la page',
      (other) =>
        `ce titre est déjà celui de « ${other} » : les moteurs n’afficheront qu’une des deux pages`,
    ),
    ...duplicates(
      input,
      'description',
      'Description',
      (other) => `cette description est déjà celle de « ${other} »`,
    ),
    ...withoutShareImage(input),
    ...businessIssues(input.business),
  ]
}

/**
 * Deux pages qui portent la même valeur, dans une langue en ligne. Le message
 * nomme l’autre page : un doublon dont on ignore l’autre côté ne se corrige
 * pas. Une langue en préparation n’est pas construite, donc jamais comparée.
 */
function duplicates(
  input: FindableInput,
  key: 'title' | 'description',
  label: string,
  say: (other: string) => string,
): readonly ContentIssue[] {
  const issues: ContentIssue[] = []

  for (const language of input.languages.online) {
    const seen = new Map<string, string>()

    for (const entry of input.pages) {
      const value = pick(entry.page.meta[key], language.code).trim()

      if (value === '') continue

      const first = seen.get(value)

      if (first === undefined) {
        seen.set(value, entry.name)
        continue
      }

      issues.push({
        severity: 'warning',
        page: entry.name,
        field: label,
        language: language.code,
        message: say(first),
      })
    }
  }

  return issues
}

/**
 * Une page dont le lien partagé ne montrera rien : ni image choisie dans
 * « meta », ni image dans une de ses sections, sur lesquelles la carte retombe
 * (D124). La carte reste servie, au petit format — c’est du premier contact
 * perdu, pas une panne.
 *
 * Une page de service en est exemptée : personne ne partage l’adresse d’un
 * remerciement, que le sitemap et le menu écartent déjà (D133).
 */
function withoutShareImage(input: FindableInput): readonly ContentIssue[] {
  const issues: ContentIssue[] = []

  // La carte est celle de la page construite : une section masquée dans une
  // langue n’y est pas, et son image ne compte pas plus qu’elle.
  for (const entry of input.pages) {
    if (isServiceRoute(entry.route)) continue

    for (const language of input.languages.online) {
      const key = shareImageKey({
        meta: entry.page.meta,
        registry: input.registry,
        sections: entry.page.blocks.filter(
          (section) => section.hidden[language.code] !== true,
        ),
      })

      if (key !== '') continue

      issues.push({
        severity: 'warning',
        page: entry.name,
        language: language.code,
        message: `le lien de cette page se partage sans vignette${input.languages.online.length > 1 ? ` en ${languageName(language.code)}` : ''} : aucune image de partage, et aucune image dans ses sections`,
      })
    }
  }

  return issues
}

/**
 * La fiche d’entreprise, dont dépend tout le nœud « Organization » du JSON-LD.
 * Sans raison sociale, le site n’en émet aucun ; sans adresse complète, le
 * type déclaré est ignoré et le nœud retombe sur « Organization ».
 */
function businessIssues(facts: BusinessFacts): readonly ContentIssue[] {
  if (!hasBusiness(facts)) {
    return [
      {
        severity: 'warning',
        page: BUSINESS_NAME,
        message:
          'aucune raison sociale : le site n’émet aucune donnée structurée d’entreprise',
      },
    ]
  }

  if (hasAddress(facts)) return []

  return [
    {
      severity: 'warning',
      page: BUSINESS_NAME,
      message: `l’adresse est incomplète : le type déclaré est ignoré, et la fiche retombe sur « Organization »`,
    },
  ]
}
