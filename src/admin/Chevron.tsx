// Le chevron d’un panneau qui s’ouvre. Il pointe vers le bas quand l’élément
// est replié, vers le haut quand il est ouvert — la rotation est dans la
// feuille de style, sur l’état du bouton qui le porte.

export function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  )
}
