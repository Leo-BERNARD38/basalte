// Les surfaces. Une carte se détache par son filet, jamais par une ombre :
// dans la page, c’est le trait qui sépare, et l’ombre ne reste qu’à ce qui
// flotte réellement au-dessus du reste.

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'
import { Text } from './Text.js'

type CardProps = ComponentProps<'div'> & {
  readonly tone?: 'raised' | undefined
  readonly nested?: boolean | undefined
  readonly pad?: 'sm' | 'lg' | undefined
  readonly children: ReactNode
}

export function Card({
  tone,
  nested,
  pad,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={joined('basalte-card', className)}
      data-tone={tone}
      data-nested={nested === true ? 'true' : undefined}
      data-pad={pad}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Un objet posé sur le canvas, au-dessus de l’aperçu : filet net, et ombre. */
export function Float({ className, children, ...rest }: ComponentProps<'div'>) {
  return (
    <div className={joined('basalte-float', className)} {...rest}>
      {children}
    </div>
  )
}

type BannerProps = ComponentProps<'div'> & {
  readonly tone?: 'refused' | 'raised' | undefined
  readonly hatched?: boolean | undefined
  readonly children: ReactNode
}

export function Banner({
  tone,
  hatched,
  className,
  children,
  ...rest
}: BannerProps) {
  return (
    <div
      className={joined('basalte-banner', className)}
      data-tone={tone}
      data-hatched={hatched === true ? 'true' : undefined}
      role={tone === 'refused' ? 'alert' : undefined}
      {...rest}
    >
      {children}
    </div>
  )
}

type EmptyProps = {
  readonly title: string
  readonly note?: string | undefined
  readonly children?: ReactNode | undefined
}

/** L’état vide : ce qui dit ce qui arrivera là, et jamais une erreur. */
export function Empty({ title, note, children }: EmptyProps) {
  return (
    <div className="basalte-empty">
      <strong>{title}</strong>
      {note !== undefined && (
        <Text tone="meta" data-size="small">
          {note}
        </Text>
      )}
      {children}
    </div>
  )
}
