// Les données structurées d’une page : ce que Google lit pour comprendre de
// quoi parle un site, plutôt que de le deviner.
//
// Deux sources, et deux seulement. La fiche d’entreprise, qui vaut pour toutes
// les pages — pour un artisan ou un commerce, c’est elle qui pèse. Et les
// sections, dont chacune peut déclarer ce qu’elle apporte : une foire aux
// questions rend un `FAQPage`.
//
// Une section déclare ces données dans son schéma, jamais dans son composant
// (D121). Un `<script>` écrit dans le composant obligerait la variante bureau à
// le recopier, et deux copies divergent — c’est précisément ce que le contrat
// des deux rendus interdit (D108).
//
// Ce fichier est pur : il ne rend pas de HTML, il rend des objets. C’est ce qui
// le rend vérifiable sans construire un site.

import type { PageBlock } from '../content/page.js'
import type { Site } from '../site/define.js'
import { hasAddress, hasBusiness, type BusinessFacts } from './business.js'

const CONTEXT = 'https://schema.org'

export type StructuredNode = Readonly<Record<string, unknown>>

/** Ce qu’une section reçoit pour décrire ce qu’elle apporte. */
export type StructuredContext = {
  readonly language: string
  /** L’adresse absolue de la page où la section se trouve. */
  readonly url: string
}

export type StructuredBuilder = (
  props: Readonly<Record<string, unknown>>,
  context: StructuredContext,
) => StructuredNode | undefined

export type StructuredBuilders = Readonly<Record<string, StructuredBuilder>>

export function originOf(site: Site): string {
  return `https://${site.domain}`
}

/**
 * L’entreprise, telle qu’elle vaut pour toutes les pages du site. Une fiche
 * sans raison sociale ne rend rien : mieux vaut aucune donnée qu’une fiche
 * vide, que Google lit comme un site mal tenu.
 *
 * Le type déclaré ne sert que si l’adresse est complète : un « commerce de
 * proximité » sans adresse n’est pas un commerce de proximité.
 */
export function businessNode(
  site: Site,
  facts: BusinessFacts,
): StructuredNode | undefined {
  if (!hasBusiness(facts)) return undefined

  const origin = originOf(site)
  const local = hasAddress(facts)

  return {
    '@context': CONTEXT,
    '@type': local ? facts.kind || 'LocalBusiness' : 'Organization',
    '@id': `${origin}/#entreprise`,
    name: facts.legalName,
    url: `${origin}/`,
    ...(local
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: facts.address.street,
            postalCode: facts.address.postalCode,
            addressLocality: facts.address.city,
            ...(facts.address.country.trim() === ''
              ? {}
              : { addressCountry: facts.address.country }),
          },
        }
      : {}),
    ...(facts.phone.trim() === '' ? {} : { telephone: facts.phone }),
    ...(facts.email.trim() === '' ? {} : { email: facts.email }),
    ...(facts.area.trim() === '' ? {} : { areaServed: facts.area }),
    ...openingHours(facts),
  }
}

function openingHours(facts: BusinessFacts): StructuredNode {
  const spans = facts.hours
    .filter(
      (row) =>
        row.day.trim() !== '' &&
        row.opens.trim() !== '' &&
        row.closes.trim() !== '',
    )
    .map((row) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `${CONTEXT}/${row.day}`,
      opens: row.opens,
      closes: row.closes,
    }))

  return spans.length === 0 ? {} : { openingHoursSpecification: spans }
}

/** Le site lui-même, posé sur la seule page d’accueil : ailleurs, il se répète. */
export function websiteNode(site: Site, url: string): StructuredNode {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: site.name,
    url,
  }
}

export function pageNodes(input: {
  readonly site: Site
  readonly business: BusinessFacts
  readonly builders: StructuredBuilders
  readonly sections: readonly PageBlock[]
  readonly route: string
  readonly language: string
  readonly url: string
}): readonly StructuredNode[] {
  const nodes: StructuredNode[] = []

  if (input.route === '/') nodes.push(websiteNode(input.site, input.url))

  const business = businessNode(input.site, input.business)

  if (business !== undefined) nodes.push(business)

  const context: StructuredContext = {
    language: input.language,
    url: input.url,
  }

  for (const section of input.sections) {
    const build = input.builders[section.type]

    if (build === undefined) continue

    const node = build(section.props, context)

    if (node !== undefined) nodes.push(node)
  }

  return nodes
}

/**
 * Le JSON tel qu’il part dans la page. Les caractères qui refermeraient la
 * balise sont échappés : un contenu porte du texte que le client écrit, et
 * `</script>` y est une chaîne comme une autre (invariant 1).
 */
export function renderStructured(node: StructuredNode): string {
  return JSON.stringify(node)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
}
