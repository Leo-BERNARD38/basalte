// Le jeu d’icônes du panel. Toutes sur une grille de vingt, en trait de 1,8 et
// à bouts ronds, sauf la poignée qui est pleine : un caractère prendrait la
// police du système, ne se recolorerait pas avec le reste, et n’aurait pas la
// même graisse que ses voisines.

import type { ReactNode } from 'react'

type IconProps = {
  readonly size?: number | undefined
}

type Drawn = IconProps & {
  readonly children: ReactNode
  readonly width?: number | undefined
  readonly label?: string | undefined
}

function Stroked({ size = 14, width = 1.8, label, children }: Drawn) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(label === undefined
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
    >
      {children}
    </svg>
  )
}

/** Six points : les sections d’une page et les éléments d’une liste. */
export function Grip({ size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
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

/** Le chevron d’un panneau qui s’ouvre, ou d’un menu qui se déroule. */
export function Chevron({ size = 12 }: IconProps) {
  return (
    <Stroked size={size} width={2}>
      <path d="M5 7.5 10 12.5 15 7.5" />
    </Stroked>
  )
}

/** Le point d’interrogation d’une aide qu’on demande (D169). */
export function Question({ size = 16 }: IconProps) {
  return (
    <Stroked size={size} width={1.6}>
      <circle cx="10" cy="10" r="7.4" />
      <path d="M7.9 8.1a2.2 2.2 0 1 1 2.7 2.1c-.4.1-.6.5-.6.9v.3" />
      <path d="M10 14.3h.01" />
    </Stroked>
  )
}

/**
 * L’œil barré : un contenu qui reste dans le panel sans paraître. Il ne se
 * nomme pas — le mot est écrit à côté de lui, et le dire deux fois l’efface.
 */
export function HiddenMark({ size = 14 }: IconProps) {
  return (
    <Stroked size={size}>
      <path d="M4.2 6.3C2.7 7.6 1.8 10 1.8 10s3.1 5.5 8.2 5.5c1.3 0 2.4-.3 3.4-.8" />
      <path d="M8.1 5c.6-.3 1.2-.5 1.9-.5 5.1 0 8.2 5.5 8.2 5.5s-.8 1.4-2.1 2.8" />
      <path d="m3 3 14 14" />
    </Stroked>
  )
}

/** La flèche qui sort du cadre : ce qui s’ouvre dans un autre onglet. */
export function External({ size = 14 }: IconProps) {
  return (
    <Stroked size={size}>
      <path d="M8.5 4.5H4.6A1.6 1.6 0 0 0 3 6.1v9.3A1.6 1.6 0 0 0 4.6 17h9.3a1.6 1.6 0 0 0 1.6-1.6v-3.9" />
      <path d="M11.5 3H17v5.5" />
      <path d="M17 3 9.6 10.4" />
    </Stroked>
  )
}

export function Plus({ size = 14 }: IconProps) {
  return (
    <Stroked size={size}>
      <path d="M10 4.6V15.4" />
      <path d="M4.6 10H15.4" />
    </Stroked>
  )
}

export function Close({ size = 16 }: IconProps) {
  return (
    <Stroked size={size} label="Fermer">
      <path d="M5 5l10 10" />
      <path d="M15 5 5 15" />
    </Stroked>
  )
}

export function Check({ size = 13 }: IconProps) {
  return (
    <Stroked size={size} width={2.2}>
      <path d="M4.5 10.5 8 14 15.5 6" />
    </Stroked>
  )
}

/** Le support bureau, dans le sélecteur d’aperçu et les réglages. */
export function Desktop({ size = 14 }: IconProps) {
  return (
    <Stroked size={size} width={1.7}>
      <rect x="2.4" y="4" width="15.2" height="10" rx="1.6" />
      <path d="M7 17h6" />
    </Stroked>
  )
}

export function Mobile({ size = 14 }: IconProps) {
  return (
    <Stroked size={size} width={1.7}>
      <rect x="6" y="2.6" width="8" height="14.8" rx="1.8" />
      <path d="M9 15h2" />
    </Stroked>
  )
}

export function Picture({ size = 12 }: IconProps) {
  return (
    <Stroked size={size}>
      <rect x="2.6" y="4" width="14.8" height="12" rx="1.8" />
      <path d="m5 13 3.4-3.4 2.6 2.6 2-2 2 2" />
    </Stroked>
  )
}

/** La flèche d’une ligne qui mène ailleurs dans le panel. */
export function ArrowRight({ size = 12 }: IconProps) {
  return (
    <Stroked size={size} width={2}>
      <path d="M7.5 5l5 5-5 5" />
    </Stroked>
  )
}
