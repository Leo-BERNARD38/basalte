// La typographie du panel. Le contraste vient de la graisse et de la taille,
// pas de la couleur : cinq pas, quatre graisses, et le chiffre en chasse fixe
// pour qu’une colonne s’aligne.

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

type TextProps = ComponentProps<'span'> & {
  readonly tone?: 'muted' | 'meta' | 'refused' | 'accent' | undefined
  readonly size?: 'small' | 'eyebrow' | undefined
  readonly children: ReactNode
}

type TitleProps = ComponentProps<'h2'> & {
  readonly rank?: 'card' | 'display' | undefined
  readonly children: ReactNode
}

export function Text({ tone, size, className, children, ...rest }: TextProps) {
  return (
    <span
      className={joined('basalte-text', className)}
      data-tone={tone}
      data-size={size}
      {...rest}
    >
      {children}
    </span>
  )
}

export function Title({ rank, className, children, ...rest }: TitleProps) {
  return (
    <h2
      className={joined('basalte-title', className)}
      data-rank={rank}
      {...rest}
    >
      {children}
    </h2>
  )
}

/** La ligne de contexte : ce qu’on lit sans le chercher, et jamais une phrase. */
export function Eyebrow({
  className,
  children,
  ...rest
}: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-eyebrow', className)} {...rest}>
      {children}
    </span>
  )
}

/** Un chiffre, une empreinte, un horodatage. */
export function Mono({ className, children, ...rest }: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-mono', className)} {...rest}>
      {children}
    </span>
  )
}
