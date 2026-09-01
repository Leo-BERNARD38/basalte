// Les boutons. Quatre rangs, et l’ordre est celui de l’engagement : le noir
// change l’état du site, le filet agit sur l’écran, le nu annule, le rouge
// détruit. L’accent n’en porte aucun — il ne dit jamais « fais ».

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

type ButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  /** Seul un formulaire en demande un autre : il soumet, et le navigateur
      vérifie alors ce que les champs exigent. */
  readonly type?: 'button' | 'submit' | undefined
  readonly tone?: 'ink' | 'line' | 'bare' | 'danger' | undefined
  readonly size?: 'xs' | 'sm' | undefined
  readonly block?: boolean | undefined
  readonly busy?: boolean | undefined
  readonly children: ReactNode
}

export function Button({
  type = 'button',
  tone = 'line',
  size,
  block,
  busy,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joined('basalte-button', className)}
      data-tone={tone}
      data-size={size}
      data-block={block === true ? 'true' : undefined}
      disabled={disabled === true || busy === true}
      {...rest}
    >
      {busy === true && <Spinner onInk={tone === 'ink'} />}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  /** Ce qu’un lecteur d’écran annonce : une icône seule ne se lit pas. */
  readonly label: string
  readonly children: ReactNode
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={joined('basalte-icon-button', className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Spinner({ onInk }: { readonly onInk?: boolean | undefined }) {
  return (
    <span
      className="basalte-spinner"
      data-on={onInk === true ? 'ink' : undefined}
    />
  )
}
