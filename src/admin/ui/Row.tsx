// La ligne de liste : l’objet le plus vu du panel. Elle garde l’arête, comme
// le champ — c’est une colonne qu’on parcourt du regard, pas un objet qu’on
// presse. Ce qu’on est en train de modifier porte l’aplat choisi — un gris
// franc, sans teinte — et l’encre y reste noire : c’est le poids de l’aplat
// qui désigne, jamais une couleur.

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

type RowProps = Omit<ComponentProps<'button'>, 'type'> & {
  readonly current?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly wrong?: boolean | undefined
  /** La forme pleine, quand la ligne vit dans un menu et non dans une colonne. */
  readonly pill?: boolean | undefined
  /**
   * La poignée de déplacement. Elle se pose à côté du bouton, jamais dedans :
   * dnd-kit la rend focalisable, et un élément qu’on atteint au clavier ne peut
   * pas vivre à l’intérieur d’un autre — c’est ce qui rend le réordonnancement
   * au clavier praticable.
   */
  readonly handle?: ReactNode | undefined
  readonly children: ReactNode
}

export function Row({
  current,
  hidden,
  wrong,
  pill,
  handle,
  className,
  children,
  ...rest
}: RowProps) {
  return (
    <div
      className={joined('basalte-row', className)}
      data-current={current === true ? 'true' : undefined}
      data-hidden={hidden === true ? 'true' : undefined}
      data-wrong={wrong === true ? 'true' : undefined}
      data-pill={pill === true ? 'true' : undefined}
    >
      {handle}
      <button
        type="button"
        className="basalte-row__label"
        aria-current={current === true ? 'true' : undefined}
        {...rest}
      >
        {children}
      </button>
    </div>
  )
}

/** Le libellé d’une ligne : il occupe la place et se coupe, jamais l’inverse. */
export function RowText({
  className,
  children,
  ...rest
}: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-row__text', className)} {...rest}>
      {children}
    </span>
  )
}

/** Deux lignes empilées, quand une date accompagne un titre. */
export function RowStack({
  className,
  children,
  ...rest
}: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-row__stack', className)} {...rest}>
      {children}
    </span>
  )
}

/** Le glyphe d’une ligne — poignée, coche. Un dessin, jamais du texte. */
export function RowGlyph({
  className,
  children,
  ...rest
}: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-row__glyph', className)} {...rest}>
      {children}
    </span>
  )
}
