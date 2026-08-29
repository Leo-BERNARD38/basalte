// Le rendu du Markdown restreint de `f.richtext`. Le texte est d’abord
// échappé en entier, puis une liste blanche de motifs y réintroduit du gras,
// de l’italique et des liens. Aucune balise ne peut donc venir du contenu
// (invariant 1), et le schéma d’une URL est vérifié après échappement, quand
// plus aucune entité ne peut en reconstruire un autre.

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const LINK = /\[([^\]]*)\]\(([^)]*)\)/g
const ALLOWED_HREF = /^(https?:\/\/|mailto:|tel:|\/|#)/i

export function renderRichtext(source: string): string {
  return source
    .replace(/\r\n?/g, '\n')
    .split(/\n[^\S\n]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => `<p>${inline(escapeHtml(paragraph))}</p>`)
    .join('')
}

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) => ESCAPES[character] ?? character,
  )
}

function inline(text: string): string {
  let output = ''
  let read = 0

  for (const match of text.matchAll(LINK)) {
    const whole = match[0]
    const label = match[1] ?? ''
    const href = (match[2] ?? '').trim()

    output += emphasis(text.slice(read, match.index))
    output += allowed(href)
      ? `<a href="${href}">${emphasis(label)}</a>`
      : emphasis(whole)

    read = match.index + whole.length
  }

  return (output + emphasis(text.slice(read))).replace(/\n/g, '<br>')
}

// Un caractère de contrôle ou une espace dans une URL sert à reconstruire un
// schéma que la liste blanche refuserait écrit en clair.
function allowed(href: string): boolean {
  for (const character of href) {
    const code = character.codePointAt(0) ?? 0

    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) return false
  }

  return ALLOWED_HREF.test(href)
}

function emphasis(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}
