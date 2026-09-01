// Les deux mises en place du panel, et la poussée qui sépare un groupe en
// deux. L’écart se choisit dans l’échelle, jamais en pixels : c’est ce qui
// tient l’alignement d’un écran à l’autre.

import type { ComponentProps, ReactNode } from 'react'

export type Gap = 'hair' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'

type StackProps = ComponentProps<'div'> & {
  readonly gap?: Gap | undefined
  readonly children: ReactNode
}

type GroupProps = StackProps & {
  readonly align?: 'center' | 'start' | 'baseline' | undefined
}

export function Stack({ gap, className, children, ...rest }: StackProps) {
  return (
    <div
      className={joined('basalte-stack', className)}
      data-gap={gap}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Group({
  gap,
  align,
  className,
  children,
  ...rest
}: GroupProps) {
  return (
    <div
      className={joined('basalte-group', className)}
      data-gap={gap}
      data-align={align}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Ce qui pousse le reste d’un groupe contre le bord opposé. */
export function Spacer() {
  return <span className="basalte-spacer" />
}

export function joined(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined).join(' ')
}
