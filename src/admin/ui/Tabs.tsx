// Les onglets : deux listes de même nature dans un même écran — les images et
// les documents de la médiathèque. Une ligne sous celui qui est ouvert, et
// c’est tout.
//
// Ce n’est pas un troisième étage de navigation : un écran qui réclamerait des
// onglets pour deux choses différentes serait deux écrans.

import type { ReactNode } from 'react'

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
