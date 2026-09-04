// La typographie du panel : l’échelle de type de Material. Un titre porte un
// style de titre ou d’en-tête, un texte un style de corps ou d’étiquette, et
// le contraste vient de la graisse et de la taille avant la couleur. Le
// chiffre passe en chasse fixe pour qu’une colonne s’aligne.

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

export type TextRole =
  'body-lg' | 'body-md' | 'body-sm' | 'label-lg' | 'label-md' | 'label-sm'

export type TitleRole =
  'headline-md' | 'headline-sm' | 'title-lg' | 'title-md' | 'title-sm'

type TextProps = ComponentProps<'span'> & {
  readonly tone?: 'muted' | 'meta' | 'refused' | 'strong' | undefined
  /** Le corps moyen par défaut. */
  readonly role?: TextRole | undefined
  readonly children: ReactNode
}

type TitleProps = ComponentProps<'h2'> & {
  /** Le grand titre par défaut ; l’en-tête moyen pour le titre d’un écran. */
  readonly role?: TitleRole | undefined
  /** Le rang dans le plan de la page. Un écran en porte un et un seul. */
  readonly level?: 1 | undefined
  readonly children: ReactNode
}

export function Text({ tone, role, className, children, ...rest }: TextProps) {
  return (
    <span
      className={joined('basalte-text', className)}
      data-tone={tone}
      data-role={role}
      {...rest}
    >
      {children}
    </span>
  )
}

export function Title({
  role,
  level,
  className,
  children,
  ...rest
}: TitleProps) {
  const Tag = level === 1 ? 'h1' : 'h2'

  return (
    <Tag
      className={joined('basalte-title', className)}
      data-role={role ?? (level === 1 ? 'headline-md' : undefined)}
      {...rest}
    >
      {children}
    </Tag>
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

/**
 * Le pluriel français : zéro et un restent au singulier. Écrit à la main, il
 * s’oublie — « 1 sections » se lisait dans le menu des pages.
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return count > 1 ? many : one
}

/** Un chiffre, une empreinte, un horodatage. */
export function Mono({ className, children, ...rest }: ComponentProps<'span'>) {
  return (
    <span className={joined('basalte-mono', className)} {...rest}>
      {children}
    </span>
  )
}
