// `basalte content` : ce que ce site contient déjà, relevé depuis le contenu.
//
// `basalte inventory` dit ce qui est *disponible* pour écrire — les blocs, les
// types de champs, leurs bornes. Rien ne disait ce qui est *écrit*. Un agent
// qui ouvrait un dépôt client lisait donc tous les JSON de `content/`, ou
// devinait. Trois questions doivent trouver leur réponse ici sans qu’un seul
// fichier soit ouvert : quelle page porte tel bloc, quelles langues sont
// remplies, quelle page n’a pas de description.
//
// Rien n’est écrit sur le disque, et il n’y a pas de `--agent` : la doc agent
// de l’inventaire peut être un fichier parce qu’elle ne change qu’avec la
// version du socle (D89), alors que ce relevé change à chaque enregistrement
// du client. Un fichier faux coûte plus qu’un fichier absent.

import type { BlockRegistry } from '../blocks/define.js'
import { SLOTS } from '../chrome/define.js'
import { isServiceRoute } from '../content/naming.js'
import { META_FIELDS, type Page } from '../content/page.js'
import { readProject } from '../content/project.js'
import { languageName } from '../content/report.js'
import {
  totalProgress,
  translationProgress,
  type Progress,
} from '../fields/progress.js'
import { pick } from '../fields/translate.js'
import { unusedMedia } from '../media/usage.js'
import { hasAddress, hasBusiness } from '../seo/business.js'
import { shareImageKey } from '../seo/meta.js'
import type { Languages } from '../site/languages.js'
import { hasFlag, succeeds } from './args.js'
import type { Result } from './run.js'

export type SectionView = {
  readonly id: string
  readonly type: string
  readonly label: string
  /** Les langues où la section est masquée, quand il y en a. */
  readonly hidden: readonly string[]
}

export type PageView = {
  readonly name: string
  readonly route: string
  /** Une page de service ne figure ni au menu, ni au sitemap (D133). */
  readonly service: boolean
  readonly title: string
  readonly description: string
  /** La clé de l’image de partage effective, repli compris. Vide si aucune. */
  readonly share: string
  readonly sections: readonly SectionView[]
  /** L’avancement des traductions, langue par langue. Vide en monolingue. */
  readonly translations: readonly Progress[]
}

export type ContentView = {
  readonly site: {
    readonly name: string
    readonly domain: string
    readonly languages: readonly {
      readonly code: string
      readonly label: string
      readonly default: boolean
      readonly draft: boolean
    }[]
  }
  readonly pages: readonly PageView[]
  readonly chrome: readonly { readonly slot: string; readonly origin: string }[]
  readonly media: {
    readonly total: number
    readonly unused: readonly string[]
    readonly withoutAlt: readonly string[]
  }
  readonly documents: {
    readonly total: number
    readonly unused: readonly string[]
  }
  readonly business: {
    readonly legalName: string
    readonly city: string
    readonly address: boolean
  }
  readonly redirects: readonly { readonly from: string; readonly to: string }[]
}

export async function content(
  argv: readonly string[],
  cwd: string,
): Promise<Result> {
  const view = await readView(cwd)

  if (hasFlag(argv, '--json')) {
    return { code: 0, stdout: `${JSON.stringify(view, null, 2)}\n`, stderr: '' }
  }

  return succeeds(render(view))
}

/** Le relevé complet, sérialisable — c’est lui que rend `--json`. */
export async function readView(cwd: string): Promise<ContentView> {
  const project = await readProject(cwd)
  const languages = project.site.languages
  const pages = project.pages.map((entry) => entry.page)

  return {
    site: {
      name: project.site.name,
      domain: project.site.domain,
      languages: languages.all.map((language) => ({
        code: language.code,
        label: languageName(language.code),
        default: language.default,
        draft: language.draft,
      })),
    },
    pages: byRoute(project.pages).map((entry) => ({
      name: entry.name,
      route: entry.route,
      service: isServiceRoute(entry.route),
      title: pick(entry.page.meta.title, languages.default.code),
      description: pick(entry.page.meta.description, languages.default.code),
      share: shareImageKey({
        meta: entry.page.meta,
        registry: project.registry,
        sections: entry.page.blocks,
      }),
      sections: entry.page.blocks.map((section) => ({
        id: section.id,
        type: section.type,
        label: project.registry[section.type]?.label ?? section.type,
        hidden: languages.codes.filter((code) => section.hidden[code] === true),
      })),
      translations: progressOf(entry.page, project.registry, languages),
    })),
    chrome: SLOTS.flatMap((slot) => {
      const source = project.chromeSources.find((entry) => entry.name === slot)

      return source === undefined ? [] : [{ slot, origin: source.origin }]
    }),
    media: {
      total: Object.keys(project.media).length,
      unused: unusedMedia({
        keys: Object.keys(project.media),
        registry: project.registry,
        pages,
        manifest: project.media,
        kind: 'image',
      }),
      withoutAlt: Object.entries(project.media)
        .filter(([, entry]) =>
          languages.online.some(
            (language) => (entry.alt[language.code] ?? '').trim() === '',
          ),
        )
        .map(([key]) => key),
    },
    documents: {
      total: Object.keys(project.documents).length,
      unused: unusedMedia({
        keys: Object.keys(project.documents),
        registry: project.registry,
        pages,
        manifest: project.media,
        kind: 'document',
      }),
    },
    business: {
      legalName: project.business.legalName,
      city: project.business.address.city,
      address: hasBusiness(project.business) && hasAddress(project.business),
    },
    redirects: Object.entries(project.site.redirects).map(([from, to]) => ({
      from,
      to,
    })),
  }
}

// L’accueil d’abord, puis les autres adresses dans l’ordre. Le disque range
// par nom de fichier, ce qui met « contact » avant « index » : une vue qui se
// parcourt du regard commence par la page que tout le monde ouvre.
function byRoute<T extends { readonly route: string }>(
  pages: readonly T[],
): readonly T[] {
  return [...pages].sort((a, b) =>
    a.route === '/' ? -1 : b.route === '/' ? 1 : a.route.localeCompare(b.route),
  )
}

// L’avancement d’une page : celui de son `meta` et celui de chacune de ses
// sections, regroupés par langue. `validatePage` le calcule déjà pour avertir
// d’une langue en préparation, mais ne le rend pas — c’est le même parcours,
// pris ici pour un autre lecteur.
function progressOf(
  page: Page,
  registry: BlockRegistry,
  languages: Languages,
): readonly Progress[] {
  return totalProgress([
    ...translationProgress(META_FIELDS, page.meta, languages),
    ...page.blocks.flatMap((section) => {
      const definition = registry[section.type]

      return definition === undefined
        ? []
        : translationProgress(definition.fields, section.props, languages)
    }),
  ])
}

export function render(view: ContentView): readonly string[] {
  return [
    `basalte content — ${view.site.name}`,
    '',
    ...languageLines(view),
    ...pageLines(view),
    ...libraryLines(view),
    ...chromeLines(view),
    ...businessLines(view),
    ...redirectLines(view),
  ]
}

function languageLines(view: ContentView): readonly string[] {
  const width = widthOf(view.site.languages.map((language) => language.code))

  return [
    'Langues',
    ...view.site.languages.map(
      (language) =>
        `  ${language.code.padEnd(width)}  ${language.label}${
          language.default
            ? ' — par défaut'
            : language.draft
              ? ' — en préparation'
              : ''
        }`,
    ),
  ]
}

function pageLines(view: ContentView): readonly string[] {
  const lines = ['', 'Pages']
  const width = widthOf(view.pages.map((page) => page.route))

  for (const page of view.pages) {
    lines.push(
      '',
      `  ${page.route.padEnd(width)}  ${page.name}.json${page.service ? ' (page de service)' : ''}`,
      `  ${''.padEnd(width)}  « ${page.title} »`,
    )

    lines.push(
      `  ${''.padEnd(width)}  ${
        page.description === ''
          ? 'sans description'
          : `${page.description.length} caractères de description`
      }, ${page.share === '' ? 'sans vignette de partage' : `vignette « ${page.share} »`}`,
    )

    lines.push(
      `  ${''.padEnd(width)}  ${
        page.sections.length === 0
          ? 'aucune section'
          : page.sections.map(describeSection).join(' · ')
      }`,
    )

    for (const entry of page.translations) {
      if (entry.total === 0 || entry.filled === entry.total) continue

      lines.push(
        `  ${''.padEnd(width)}  ${languageName(entry.language)} : ${entry.filled} champ(s) traduit(s) sur ${entry.total}`,
      )
    }
  }

  return lines
}

function describeSection(section: SectionView): string {
  return `${section.type} ${section.id}${
    section.hidden.length === 0
      ? ''
      : ` (masqué en ${section.hidden.join(', ')})`
  }`
}

function libraryLines(view: ContentView): readonly string[] {
  return [
    '',
    'Médiathèque',
    `  ${count(view.media.total, 'image')}${detail([
      [view.media.unused.length, 'inemployée'],
      [view.media.withoutAlt.length, 'sans texte alternatif'],
    ])}`,
    `  ${count(view.documents.total, 'document')}${detail([
      [view.documents.unused.length, 'inemployé'],
    ])}`,
  ]
}

function chromeLines(view: ContentView): readonly string[] {
  return [
    '',
    'En-tête et pied de page',
    `  ${view.chrome
      .map((slot) => `${slot.slot} (${slot.origin})`)
      .join(' · ')}`,
  ]
}

function businessLines(view: ContentView): readonly string[] {
  return [
    '',
    'Fiche',
    view.business.legalName === ''
      ? '  aucune raison sociale — le site n’émet aucune donnée d’entreprise'
      : `  ${view.business.legalName}${view.business.city === '' ? '' : ` — ${view.business.city}`}${
          view.business.address ? '' : ', adresse incomplète'
        }`,
  ]
}

function redirectLines(view: ContentView): readonly string[] {
  if (view.redirects.length === 0) return []

  return [
    '',
    'Redirections',
    ...view.redirects.map((entry) => `  ${entry.from} → ${entry.to}`),
  ]
}

function detail(parts: readonly (readonly [number, string])[]): string {
  const kept = parts.filter(([value]) => value > 0)

  if (kept.length === 0) return ''

  return ` — ${kept.map(([value, noun]) => count(value, noun)).join(', ')}`
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value > 1 ? 's' : ''}`
}

function widthOf(values: readonly string[]): number {
  return Math.max(...values.map((value) => value.length), 0)
}
