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
      <span id={id} className="basalte-text" data-size="eyebrow">
        {label}
      </span>
    </span>
  )
}

/**
 * Une ligne d’interrupteur : le libellé à gauche, l’interrupteur au bout,
 * sur un conteneur qui les tient ensemble. C’est ce qu’un titre porte à côté
 * de lui quand la colonne est large, et sous lui quand elle ne l’est pas —
 * et la ligne ne change pas de forme entre les deux.
 */
export function SwitchRow(props: Omit<SwitchProps, 'shown'>) {
  return (
    <div className="basalte-switch-row">
      <Switch {...props} shown />
    </div>
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
  readonly block?: boolean | undefined
}

export function Segmented<T extends string>({
  value,
  items,
  onChange,
  label,
  block,
}: SegmentedProps<T>) {
  return (
    <div
      className="basalte-segmented"
      role="group"
      aria-label={label}
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
