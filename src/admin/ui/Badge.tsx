// Les marques. Une marque est un filet et un point de six pixels, pas un aplat
// de couleur : posés côte à côte, trois badges pleins se disputent l’attention
// et l’écran devient une guirlande. Le contenant est arrondi jusqu’au bout,
// comme le point qu’il contient.

import type { ReactNode } from 'react'

type BadgeProps = {
  readonly tone?: 'muted' | 'refused' | undefined
  readonly dot?: 'ink' | 'online' | undefined
  /** Les hachures : ce qui n’existe pas encore sur le site. */
  readonly hatched?: boolean | undefined
  readonly children: ReactNode
}

export function Badge({ tone, dot, hatched, children }: BadgeProps) {
  return (
    <span
      className="basalte-badge"
      data-tone={tone}
      data-hatched={hatched === true ? 'true' : undefined}
    >
      {dot !== undefined && (
        <span
          className="basalte-badge__dot"
          data-tone={dot === 'online' ? 'online' : undefined}
        />
      )}
      {children}
    </span>
  )
}

type MarkProps = {
  readonly tone?: 'accent' | undefined
  readonly hatched?: boolean | undefined
  readonly children: ReactNode
}

/**
 * La micro-marque de dix-neuf pixels : elle tient dans la hauteur d’une ligne
 * de liste, et qualifie celle-ci sans qu’on la quitte du regard.
 */
export function Mark({ tone, hatched, children }: MarkProps) {
  return (
    <span
      className="basalte-mark"
      data-tone={tone}
      data-hatched={hatched === true ? 'true' : undefined}
    >
      {children}
    </span>
  )
}

/** Le seul compteur du panel, et le seul rouge qui ne dise pas « refusé ». */
export function Count({ children }: { readonly children: ReactNode }) {
  return <span className="basalte-count">{children}</span>
}
