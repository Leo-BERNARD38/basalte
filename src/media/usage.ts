// Les médias référencés par le contenu. Trois besoins s’en servent : le panel
// refuse de supprimer une image ou un document encore employé, `basalte check`
// signale ceux que plus rien n’emploie, et le même parcours dit si une image
// tient le format que son emplacement déclare.

import type { BlockRegistry } from '../blocks/define.js'
import { META_FIELDS, type PageBlock } from '../content/page.js'
import { walkValues } from '../fields/walk.js'
import type { ContentIssue } from '../content/report.js'
import { POST_SLOT } from '../journal/define.js'
import {
  BUSINESS_ENTRY,
  BUSINESS_FIELDS,
  BUSINESS_TITLE,
} from '../seo/business.js'
import type { MediaManifest } from './manifest.js'
import { matchesRatio } from './ratio.js'

export type MediaUsage = ReadonlyMap<string, number>

export type UsageSource = {
  readonly meta: unknown
  readonly blocks: readonly PageBlock[]
}

/** Ce sur quoi un emploi se compte : les schémas, et tout ce qui les remplit. */
export type UsageScope = {
  readonly registry: BlockRegistry
  readonly pages: readonly UsageSource[]
}

/**
 * Tout ce qui peut citer un média, et non les seules pages : le chrome, la
 * fiche de l’entreprise et les billets en portent aussi. Le panel et la CLI
 * composent leur périmètre ici, si bien qu’aucun des deux ne peut oublier un
 * gisement que l’autre compte — et qu’un logo d’en-tête ne passe plus pour
 * une image que rien n’emploie.
 */
export function usageScope(input: {
  readonly registry: BlockRegistry
  readonly chrome: BlockRegistry
  readonly journal: BlockRegistry
  readonly pages: readonly UsageSource[]
  readonly chromeValues: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >
  readonly business: Readonly<Record<string, unknown>>
  /** Les champs de chaque billet, quand `pages` ne les porte pas déjà compilés. */
  readonly posts?: readonly Readonly<Record<string, unknown>>[]
}): UsageScope {
  const section = (
    type: string,
    props: Readonly<Record<string, unknown>>,
  ): UsageSource => ({
    meta: {},
    blocks: [{ id: type, type, hidden: {}, props }],
  })

  return {
    registry: {
      ...input.registry,
      ...input.chrome,
      ...input.journal,
      [BUSINESS_ENTRY]: {
        name: BUSINESS_ENTRY,
        label: BUSINESS_TITLE,
        fields: BUSINESS_FIELDS,
      },
    },
    pages: [
      ...input.pages,
      ...Object.entries(input.chromeValues).map(([slot, props]) =>
        section(slot, props),
      ),
      section(BUSINESS_ENTRY, input.business),
      ...(input.posts ?? []).map((fields) => section(POST_SLOT, fields)),
    ],
  }
}

export function countMediaUsage(
  registry: BlockRegistry,
  pages: readonly UsageSource[],
  kind: 'image' | 'document' = 'image',
): MediaUsage {
  const counts = new Map<string, number>()

  const tally = (fields: Parameters<typeof walkValues>[0], values: unknown) => {
    walkValues(fields, values, (field, value) => {
      if (field.kind !== kind) return

      const key = typeof value === 'string' ? value.trim() : ''

      if (key !== '') counts.set(key, (counts.get(key) ?? 0) + 1)
    })
  }

  for (const page of pages) {
    tally(META_FIELDS, page.meta)

    for (const section of page.blocks) {
      const definition = registry[section.type]

      if (definition !== undefined) tally(definition.fields, section.props)
    }
  }

  return counts
}

/**
 * Les emplois, augmentés de ceux qu’un recadrage vaut à son originale. Sans
 * cette règle, une image dont seul le recadrage est en ligne passerait pour
 * orpheline, et le panel accepterait de supprimer ce dont il faut repartir
 * pour recadrer à nouveau.
 */
export function withLineage(
  usage: MediaUsage,
  manifest: MediaManifest,
): MediaUsage {
  const counts = new Map(usage)

  for (const [key, entry] of Object.entries(manifest)) {
    const origin = entry.source

    if (origin === undefined) continue

    const derived = counts.get(key) ?? 0

    if (derived > 0) counts.set(origin, (counts.get(origin) ?? 0) + derived)
  }

  return counts
}

/**
 * Les clés que plus aucune section n’emploie. Git ne supprime rien : une image
 * ou un document laissé là reste dans le dépôt, et le retirer à la main
 * casserait un retour arrière. Ce relevé sert deux lecteurs — `basalte check`
 * le signale, `basalte content` le compte.
 */
export function unusedMedia(input: {
  readonly keys: readonly string[]
  readonly registry: BlockRegistry
  readonly pages: readonly UsageSource[]
  readonly manifest: MediaManifest
  readonly kind: 'image' | 'document'
}): readonly string[] {
  const counted = countMediaUsage(input.registry, input.pages, input.kind)
  const usage =
    input.kind === 'image' ? withLineage(counted, input.manifest) : counted

  return input.keys.filter((key) => (usage.get(key) ?? 0) === 0)
}

export type RatioSource = UsageSource & { readonly name: string }

/**
 * Les images qui ne tiennent pas le format de leur emplacement. C’est ce qui
 * rend vivant un `ratio` déclaré : le panel ne recadre pas (D178), c’est le
 * point focal qui cadre l’image dans son emplacement, et ceci signale celle
 * dont les proportions s’en éloignent trop.
 *
 * Un avertissement, jamais une erreur : la page s’affiche, et forcer sa
 * correction avant tout enregistrement bloquerait un site qui fonctionne.
 */
export function checkRatios(
  registry: BlockRegistry,
  pages: readonly RatioSource[],
  manifest: MediaManifest,
): readonly ContentIssue[] {
  const issues: ContentIssue[] = []

  const inspect = (
    fields: Parameters<typeof walkValues>[0],
    values: unknown,
    page: string,
    section?: ContentIssue['section'],
  ) => {
    walkValues(fields, values, (field, value) => {
      if (field.kind !== 'image' || field.ratio === undefined) return

      const key = typeof value === 'string' ? value.trim() : ''
      const entry = key === '' ? undefined : manifest[key]

      if (entry === undefined || matchesRatio(entry, field.ratio)) return

      issues.push({
        severity: 'warning',
        page,
        ...(section === undefined ? {} : { section }),
        field: field.label ?? 'image',
        message: `l’image « ${key} » est en ${entry.width}×${entry.height}, et cet emplacement attend des proportions ${field.ratio} : règle son point focal dans l’onglet Médias, ou choisis une image en ${field.ratio}`,
      })
    })
  }

  for (const page of pages) {
    inspect(META_FIELDS, page.meta, page.name)

    for (const [index, section] of page.blocks.entries()) {
      const definition = registry[section.type]

      if (definition === undefined) continue

      inspect(definition.fields, section.props, page.name, {
        index,
        id: section.id,
        label: definition.label,
      })
    }
  }

  return issues
}
