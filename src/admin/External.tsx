// La flèche qui sort du cadre : ce qui s’ouvre dans un autre onglet. Dessinée
// comme les trois autres, sur la grille de vingt — un caractère « ↗ » prenait
// la police du système, ne se recolorait pas avec le reste, et n’avait pas la
// même graisse que les icônes voisines.

export function External() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.5 4.5H4.6A1.6 1.6 0 0 0 3 6.1v9.3A1.6 1.6 0 0 0 4.6 17h9.3a1.6 1.6 0 0 0 1.6-1.6v-3.9" />
      <path d="M11.5 3H17v5.5" />
      <path d="M17 3 9.6 10.4" />
    </svg>
  )
}
