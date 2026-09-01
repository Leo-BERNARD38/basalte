// Les deux interrupteurs. Le premier dit oui ou non, le second choisit parmi
// deux ou trois. Tous deux sont pleinement arrondis : ce qui étiquette un état
// prend la forme pleine, et seuls le champ, la ligne et la surface l’évitent.

import { useId, type ReactNode } from 'react'

type SwitchProps = {
  readonly on: boolean
  readonly label: string
  /** Le libellé s’écrit à côté, au lieu de n’exister que pour la synthèse. */
  readonly shown?: boolean | undefined
  readonly onChange: () => void
  readonly disabled?: boolean | undefined
}

export function Switch({ on, label, shown, onChange, disabled }: SwitchProps) {
  const id = useId()

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      {...(shown === true
        ? { 'aria-labelledby': id }
        : { 'aria-label': label })}
      className="basalte-switch"
      data-on={on ? 'true' : undefined}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="basalte-switch__thumb" />
    </button>
  )

  if (shown !== true) return control

  return (
    <span className="basalte-switch-line">
      {control}
      <span id={id} className="basalte-text" data-size="small">
        {label}
      </span>
    </span>
  )
}

export type Segment<T extends string> = {
  readonly value: T
  readonly label: ReactNode
  /** Un segment éteint reste lisible : il dit ce qui n’est pas choisi. */
  readonly off?: boolean | undefined
}

type SegmentedProps<T extends string> = {
  readonly value: T
  readonly items: readonly Segment<T>[]
  readonly onChange: (value: T) => void
  readonly label: string
  /** Le pouce noir, quand le choix porte sur ce qu’on regarde. */
  readonly tone?: 'ink' | undefined
  readonly block?: boolean | undefined
}

export function Segmented<T extends string>({
  value,
  items,
  onChange,
  label,
  tone,
  block,
}: SegmentedProps<T>) {
  return (
    <div
      className="basalte-segmented"
      role="group"
      aria-label={label}
      data-tone={tone}
      data-block={block === true ? 'true' : undefined}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="basalte-segmented__item"
          data-on={item.value === value ? 'true' : undefined}
          data-off={item.off === true ? 'true' : undefined}
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
