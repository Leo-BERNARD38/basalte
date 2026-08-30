// Le rendu du Markdown restreint de `f.richtext`. Le texte est d’abord
// échappé en entier, puis une liste blanche de motifs y réintroduit du gras,
// de l’italique et des liens. Aucune balise ne peut donc venir du contenu
// (invariant 1), et le schéma d’une URL est vérifié après échappement, quand
// plus aucune entité ne peut en reconstruire un autre.
//
// La liste blanche des adresses est celle de `href.ts`, la même que celle du
// champ `f.url()` : un lien accepté ici l’est là, et réciproquement.
//
// Titres et listes ne sont lus que si le champ les déclare. Un corps de
// section garde donc la grammaire minimale — le titre de la section est déjà
// un titre — alors qu’un document légal, qui a besoin d’une structure pour
// être lisible, les demande. Le rang le plus haut est `h2` : le `h1` d’une
// page est le sien.

import { allowedHref } from './href.js'

export type RichtextGrammar = {
  readonly headings?: boolean
  readonly lists?: boolean
}

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const LINK = /\[([^\]]*)\]\(([^)]*)\)/g
const HEADING = /^(#{2,3}) +(.+)$/
const BULLET = /^[-*] +(.+)$/
const NUMBERED = /^\d+\. +(.+)$/

type Block =
  | { readonly kind: 'paragraph'; readonly lines: string[] }
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | {
      readonly kind: 'list'
      readonly ordered: boolean
      readonly items: string[]
    }

export function renderRichtext(
  source: string,
  grammar: RichtextGrammar = {},
): string {
  return blocksOf(source.replace(/\r\n?/g, '\n').split('\n'), grammar)
    .map(render)
    .join('')
}

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) => ESCAPES[character] ?? character,
  )
}

// Une ligne vide ferme le bloc courant, un titre en ouvre et en ferme un à lui
// seul, et une suite d’éléments de même nature fait une liste. Les lignes d’un
// paragraphe sont gardées telles quelles : ce n’est qu’une fois réunies
// qu’elles sont ébarbées, ce qui laisse l’espacement intérieur intact.
function blocksOf(
  lines: readonly string[],
  grammar: RichtextGrammar,
): readonly Block[] {
  const blocks: Block[] = []
  let open: Block | undefined

  const close = () => {
    if (open !== undefined) blocks.push(open)
    open = undefined
  }

  for (const line of lines) {
    if (line.trim() === '') {
      close()
      continue
    }

    const heading = grammar.headings === true ? HEADING.exec(line) : null

    if (heading !== null) {
      close()
      blocks.push({
        kind: 'heading',
        level: (heading[1] ?? '').length,
        text: heading[2] ?? '',
      })
      continue
    }

    const item = grammar.lists === true ? itemOf(line) : undefined

    if (item !== undefined) {
      if (open?.kind !== 'list' || open.ordered !== item.ordered) close()

      if (open === undefined) {
        open = { kind: 'list', ordered: item.ordered, items: [] }
      }

      if (open.kind === 'list') open.items.push(item.text)
      continue
    }

    if (open?.kind !== 'paragraph') close()

    if (open === undefined) open = { kind: 'paragraph', lines: [] }

    if (open.kind === 'paragraph') open.lines.push(line)
  }

  close()

  return blocks
}

function itemOf(
  line: string,
): { readonly ordered: boolean; readonly text: string } | undefined {
  const bullet = BULLET.exec(line)

  if (bullet !== null) return { ordered: false, text: bullet[1] ?? '' }

  const numbered = NUMBERED.exec(line)

  if (numbered !== null) return { ordered: true, text: numbered[1] ?? '' }

  return undefined
}

function render(block: Block): string {
  if (block.kind === 'heading') {
    return `<h${block.level}>${markup(block.text)}</h${block.level}>`
  }

  if (block.kind === 'list') {
    const tag = block.ordered ? 'ol' : 'ul'
    const items = block.items.map((item) => `<li>${markup(item)}</li>`).join('')

    return `<${tag}>${items}</${tag}>`
  }

  return `<p>${markup(block.lines.join('\n').trim())}</p>`
}

function markup(text: string): string {
  return inline(escapeHtml(text))
}

function inline(text: string): string {
  let output = ''
  let read = 0

  for (const match of text.matchAll(LINK)) {
    const whole = match[0]
    const label = match[1] ?? ''
    const href = (match[2] ?? '').trim()

    output += emphasis(text.slice(read, match.index))
    output += allowedHref(href)
      ? `<a href="${href}">${emphasis(label)}</a>`
      : emphasis(whole)

    read = match.index + whole.length
  }

  return (output + emphasis(text.slice(read))).replace(/\n/g, '<br>')
}

function emphasis(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}
