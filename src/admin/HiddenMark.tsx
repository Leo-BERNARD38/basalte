// L’œil barré : ce qui dit qu’un contenu reste dans le panel sans paraître sur
// le site. Les sections d’une page et les billets du journal le partagent.

export function HiddenMark() {
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
      aria-label="Masquée"
      role="img"
    >
      <path d="M4.2 6.3C2.7 7.6 1.8 10 1.8 10s3.1 5.5 8.2 5.5c1.3 0 2.4-.3 3.4-.8" />
      <path d="M8.1 5c.6-.3 1.2-.5 1.9-.5 5.1 0 8.2 5.5 8.2 5.5s-.8 1.4-2.1 2.8" />
      <path d="m3 3 14 14" />
    </svg>
  )
}
