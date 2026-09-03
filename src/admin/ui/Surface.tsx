// Les surfaces. Une carte est un conteneur posé sur le fond : elle s’en
// détache par sa couleur, la plus claire des surfaces, et par son rayon.
// Élevée, elle porte la première ombre ; contournée, un filet (D200).

import type { ComponentProps, ReactNode } from 'react'

import { ErrorMark } from './icons.js'
import { joined } from './Layout.js'
import { Text } from './Text.js'

type CardProps = ComponentProps<'div'> & {
  readonly variant?: 'elevated' | 'outlined' | undefined
  /** Le conteneur bas : une carte posée dans une autre, ou en retrait. */
  readonly tone?: 'raised' | undefined
  readonly nested?: boolean | undefined
  readonly pad?: 'sm' | 'lg' | undefined
  readonly children: ReactNode
}

export function Card({
  variant,
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
      data-variant={variant}
      data-tone={tone}
      data-nested={nested === true ? 'true' : undefined}
      data-pad={pad}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Un objet posé sur le canvas, au-dessus de l’aperçu : la deuxième ombre. */
export function Float({ className, children, ...rest }: ComponentProps<'div'>) {
  return (
    <div className={joined('basalte-float', className)} {...rest}>
      {children}
    </div>
  )
}

type BannerProps = ComponentProps<'div'> & {
  readonly tone?: 'refused' | 'watch' | 'raised' | undefined
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
      aria-live={tone === 'watch' ? 'polite' : undefined}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * Ce qui a échoué au niveau du site, et qui n’est attaché à aucun champ : une
 * mise en ligne qui n’a pas abouti, un enregistrement que le serveur a refusé
 * en bloc. Le bandeau traverse la fenêtre sous la barre d’application, sur le
 * conteneur du refus — il n’appartient à aucun écran, il ne défile pas, et il
 * reste jusqu’à ce que la cause disparaisse.
 *
 * C’est la forme réservée à l’**annonce** : une icône, un titre, une
 * précision, rien à cliquer. Ce qui se corrige champ par champ reste dans la
 * page, où le clic mène à l’endroit fautif (D166).
 */
export function Alert({
  title,
  children,
}: {
  readonly title: string
  readonly children?: ReactNode | undefined
}) {
  return (
    <div className="basalte-alert" role="alert">
      <ErrorMark size={18} />
      <span className="basalte-alert__text">
        <strong>{title}</strong>
        {children !== undefined && (
          <span className="basalte-alert__note">{children}</span>
        )}
      </span>
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
      {note !== undefined && <Text tone="meta">{note}</Text>}
      {children}
    </div>
  )
}
