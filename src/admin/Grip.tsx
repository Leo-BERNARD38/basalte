// La poignée de déplacement, dessinée une fois : les sections d’une page et
// les éléments d’une liste répétable la partagent. Six points sur une grille
// de 20, jamais un caractère — un glyphe ne se recolore pas avec le reste.

export function Grip() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="7.4" cy="4.6" r="1.2" />
      <circle cx="12.6" cy="4.6" r="1.2" />
      <circle cx="7.4" cy="10" r="1.2" />
      <circle cx="12.6" cy="10" r="1.2" />
      <circle cx="7.4" cy="15.4" r="1.2" />
      <circle cx="12.6" cy="15.4" r="1.2" />
    </svg>
  )
}
