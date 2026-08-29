// Les migrations de format de contenu. Elles vivent dans le socle, jamais dans
// un dépôt client : elles arrivent avec `npm install`, et il n’y a rien à
// brancher.
//
// Chacune transforme le JSON d’une page d’un format vers le suivant. La liste
// est écrite à la main plutôt que découverte sur le disque : l’ordre est ce qui
// donne son sens à une suite de migrations, et un dossier parcouru le confierait
// à un tri de noms de fichiers.
//
// Une migration reçoit du JSON brut, pas une `Page` : elle travaille justement
// sur une forme que le socle installé ne sait plus lire.

export type RawPage = Record<string, unknown>

export type Migration = {
  /** Le format obtenu. Une migration part toujours de `to - 1`. */
  readonly to: number
  /** Ce qu’elle fait, en français, tel que `basalte migrate` l’affiche. */
  readonly label: string
  page(page: RawPage): RawPage
}

export const MIGRATIONS: readonly Migration[] = []

/** Celles qui restent à appliquer à une page, dans l’ordre. */
export function pendingFrom(
  format: number,
  target: number,
  migrations: readonly Migration[] = MIGRATIONS,
): readonly Migration[] {
  return migrations
    .filter((migration) => migration.to > format && migration.to <= target)
    .toSorted((a, b) => a.to - b.to)
}
