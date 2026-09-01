// Le point d’interrogation d’une aide qu’on demande. Dessiné comme les quatre
// autres, sur la grille de vingt : un caractère prendrait la police du système
// et ne se recolorerait pas avec le reste.

export function Question() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.4" />
      <path d="M7.9 8.1a2.2 2.2 0 1 1 2.7 2.1c-.4.1-.6.5-.6.9v.3" />
      <path d="M10 14.3h.01" />
    </svg>
  )
}
