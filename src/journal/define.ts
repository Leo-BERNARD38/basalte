// Ce qu’est un billet, et ce que le socle en sait sans ouvrir un fichier.
//
// Un billet est la première chose que le client **crée** lui-même. D3 lui
// refusait la création de pages, et cette raison-là tient toujours : il ne
// choisit ni son adresse, ni sa place dans le menu, ni sa mise en page. Il
// remplit un formulaire dont les champs sont ici, et le socle en fait une page.
//
// Le module est pur — ni disque, ni schéma chargé. C’est ce qui lui permet
// d’être lu à la fois par le rendu du site, par le CLI et par le panel, qui
// vit dans un navigateur.

import { f } from '../fields/define.js'
import type { Translated, Values } from '../fields/types.js'

/** Le nom du gabarit : le dossier qui le porte, et le type de sa section. */
export const POST_SLOT = 'post'

/** Le nom sous lequel le panel range le journal dans sa navigation. */
export const JOURNAL_ENTRY = 'journal'

const DEFAULT_BASE = 'actualites'
const DEFAULT_LABEL = 'Actualités'

const BASE = /^[a-z0-9][a-z0-9-]*$/

/**
 * Ce qu’un site déclare de son journal. La clé absente veut dire « pas de
 * journal » : ni onglet dans le panel, ni route, ni flux. C’est la lecture à
 * l’exécution que D98 demande, et non un drapeau d’`init` qui ferait deux
 * socles.
 */
export type JournalDeclaration = {
  /** Le segment d’URL des billets, et le nom de leur dossier dans `content/`. */
  readonly base?: string
  /** Ce que le client lit dans le panel et dans le titre du flux. */
  readonly label?: string
}

export type Journal = {
  readonly base: string
  readonly label: string
}

export function resolveJournal(
  declaration: JournalDeclaration | undefined,
): Journal | undefined {
  if (declaration === undefined) return undefined

  const base = declaration.base ?? DEFAULT_BASE

  if (!BASE.test(base)) {
    throw new Error(
      `« ${base} » n’est pas un segment d’adresse : minuscules, chiffres et tirets, à l’image d’un nom de page.`,
    )
  }

  const label = (declaration.label ?? DEFAULT_LABEL).trim()

  if (label === '') {
    throw new Error(
      'Le journal doit porter un nom : c’est ce que le client lit dans le panel.',
    )
  }

  return { base, label }
}

/**
 * Les champs d’un billet. Ils sont fixes, et c’est tout l’intérêt : un billet
 * s’écrit en ouvrant un formulaire, jamais en composant une page. Trois cents
 * billets composés à la main dériveraient les uns des autres.
 *
 * `title` et `excerpt` portent les bornes de `META_FIELDS` parce qu’ils
 * **deviennent** le titre et la description de la page du billet : le client
 * écrit une seule fois ce que Google affichera.
 */
export const POST_FIELDS = {
  title: f.text({
    label: 'Titre',
    help: 'Ce que Google affiche en bleu, et le grand titre du billet.',
    i18n: true,
    required: true,
    max: 60,
  }),
  date: f.date({
    label: 'Date',
    help: 'Le jour du billet. C’est lui qui ordonne le journal.',
    required: true,
  }),
  excerpt: f.textarea({
    label: 'Résumé',
    help: 'Les deux lignes lues dans la liste et sous le titre dans les résultats.',
    i18n: true,
    required: true,
    max: 160,
    rows: 2,
  }),
  cover: f.image({
    label: 'Image de couverture',
    help: 'Elle ouvre le billet, et c’est elle qu’on voit quand le lien est partagé.',
    ratio: '16/9',
  }),
  body: f.richtext({
    label: 'Texte',
    i18n: true,
    required: true,
    headings: true,
    lists: true,
  }),
  gallery: f.list({
    label: 'Photos',
    help: 'Facultatif : des images en fin de billet.',
    of: {
      image: f.image({ label: 'Photo', required: true }),
      caption: f.text({ label: 'Légende', i18n: true, max: 120 }),
    },
    max: 12,
    itemLabel: 'caption',
  }),
} as const

export type PostFields = Values<typeof POST_FIELDS>

/** Un billet tel qu’il est sur le disque, une fois validé. */
export type Post = {
  readonly $format: number
  /** Le nom du fichier, qui est aussi le dernier segment de l’adresse. */
  readonly slug: string
  /** Masqué par langue, exactement comme une section (D107). */
  readonly hidden: Translated<boolean>
  readonly fields: PostFields
}

export function journalRoute(journal: Journal): string {
  return `/${journal.base}`
}

export function postRoute(journal: Journal, slug: string): string {
  return `/${journal.base}/${slug}`
}

/**
 * Le slug tiré d’un titre. Il est calculé une seule fois, à la création, puis
 * ne bouge plus : c’est le nom du fichier, donc l’adresse, et corriger un
 * titre ne doit jamais casser un lien déjà partagé.
 */
export function slugify(title: string): string {
  const plain = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return plain.slice(0, 60).replace(/-+$/, '')
}

/**
 * Un slug libre, quand celui du titre est déjà pris. Deux billets peuvent
 * porter le même titre à un an d’intervalle, et le second ne doit pas écraser
 * le premier.
 */
export function freeSlug(
  wanted: string,
  taken: ReadonlySet<string>,
): string | undefined {
  if (wanted === '') return undefined
  if (!taken.has(wanted)) return wanted

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${wanted}-${suffix}`

    if (!taken.has(candidate)) return candidate
  }

  return undefined
}
