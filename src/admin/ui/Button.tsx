// Les boutons de Material. Quatre formes, et l’ordre est celui de
// l’engagement : le plein change l’état du site, le tonal agit sur l’écran,
// le contour propose, le texte annule. Le ton d’erreur se pose sur n’importe
// laquelle et dit qu’on détruit (D201).

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

export type Variant = 'filled' | 'tonal' | 'outlined' | 'text'

type ButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  /** Seul un formulaire en demande un autre : il soumet, et le navigateur
      vérifie alors ce que les champs exigent. */
  readonly type?: 'button' | 'submit' | undefined
  readonly variant?: Variant | undefined
  readonly tone?: 'error' | undefined
  readonly size?: 'xs' | 'sm' | undefined
  readonly block?: boolean | undefined
  readonly busy?: boolean | undefined
  /** L’icône qui précède le libellé. */
  readonly icon?: ReactNode | undefined
  readonly children: ReactNode
}

export function Button({
  type = 'button',
  variant = 'outlined',
  tone,
  size,
  block,
  busy,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joined('basalte-button', className)}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      data-block={block === true ? 'true' : undefined}
      disabled={disabled === true || busy === true}
      {...rest}
    >
      {busy === true ? <Spinner /> : icon}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  /** Ce qu’un lecteur d’écran annonce : une icône seule ne se lit pas. */
  readonly label: string
  readonly variant?: 'filled' | 'tonal' | 'outlined' | undefined
  readonly size?: 'sm' | undefined
  /** Un bouton-icône qui tient un état : choisi, il prend le conteneur. */
  readonly toggled?: boolean | undefined
  readonly children: ReactNode
}

export function IconButton({
  label,
  variant,
  size,
  toggled,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={joined('basalte-icon-button', className)}
      data-variant={variant}
      data-size={size}
      data-toggled={toggled === true ? 'true' : undefined}
      aria-label={label}
      aria-pressed={toggled}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}

type FabProps = Omit<ComponentProps<'button'>, 'type'> & {
  readonly label: string
  readonly icon: ReactNode
  /** Le libellé écrit à côté de l’icône, quand la place le permet. */
  readonly extended?: boolean | undefined
}

/** Le bouton flottant : l’action première d’un écran, posée au-dessus de lui. */
export function Fab({ label, icon, extended, className, ...rest }: FabProps) {
  return (
    <button
      type="button"
      className={joined('basalte-fab', className)}
      data-extended={extended === true ? 'true' : undefined}
      aria-label={label}
      title={extended === true ? undefined : label}
      {...rest}
    >
      {icon}
      {extended === true && label}
    </button>
  )
}

/** L’attente circulaire, à la couleur de ce qui l’entoure. */
export function Spinner() {
  return <span className="basalte-spinner" />
}
