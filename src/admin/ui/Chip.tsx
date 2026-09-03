// La puce de Material : un choix qu’on filtre ou une aide qu’on propose.
// Choisie, elle perd son contour et prend le conteneur secondaire.

import type { ComponentProps, ReactNode } from 'react'

import { joined } from './Layout.js'

type ChipProps = Omit<ComponentProps<'button'>, 'type'> & {
  /** Choisie, quand la puce filtre. */
  readonly on?: boolean | undefined
  readonly icon?: ReactNode | undefined
  readonly children: ReactNode
}

export function Chip({ on, icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={joined('basalte-chip', className)}
      data-on={on === true ? 'true' : undefined}
      aria-pressed={on}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export type Tab<T extends string> = {
  readonly value: T
  readonly label: ReactNode
}

type TabsProps<T extends string> = {
  readonly value: T
  readonly items: readonly Tab<T>[]
  readonly onChange: (value: T) => void
  readonly label: string
}

/** Les onglets, quand un écran tient deux listes de même nature. */
export function Tabs<T extends string>({
  value,
  items,
  onChange,
  label,
}: TabsProps<T>) {
  return (
    <div className="basalte-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          className="basalte-tab"
          data-on={item.value === value ? 'true' : undefined}
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
