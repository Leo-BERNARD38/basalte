// Lire une ligne de code sans se faire prendre par ce qu’elle cite. Les règles
// de ce dossier travaillent sur du texte : aucun analyseur, parce que le socle
// n’ajoute pas une dépendance pour lire ses propres fichiers.
//
// Deux pièges seulement, et ils suffisent à fausser une règle : une consigne
// citée dans un commentaire, et une accolade ou une parenthèse ouverte à
// l’intérieur d’une chaîne — un libellé français en porte souvent une.

/** Une ligne qui ne fait que commenter. */
export function isComment(text: string): boolean {
  return /^\s*(?:\/\/|\*|\/\*)/.test(text)
}

/** La même ligne, ses chaînes et son commentaire de fin retirés. */
export function withoutText(text: string): string {
  return text
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/\/\/.*$/, '')
}

/** Ce que la ligne ouvre, moins ce qu’elle ferme. */
export function balance(text: string): number {
  const opened = text.match(/[({]/g)?.length ?? 0
  const closed = text.match(/[)}]/g)?.length ?? 0

  return opened - closed
}
