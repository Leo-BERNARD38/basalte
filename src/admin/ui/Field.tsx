// Le champ, et ce qui l’entoure : son libellé, son aide, et l’erreur qui le
// désigne. C’est ici que se tient l’affichage d’un refus de validation (D166)
// — une phrase posée ailleurs oblige à relire l’écran pour retrouver lequel.
//
// Le champ garde l’arête : une colonne de formulaire se lit sur un axe
// vertical net. Le focus noircit le filet et pose l’anneau d’accent à côté.

import { useId, type ComponentProps, type ReactNode } from 'react'

import { Chevron } from './icons.js'
import { joined } from './Layout.js'

type FieldProps = {
  readonly label?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly required?: boolean | undefined
  /** Reçoit ce qu’un contrôle doit porter pour que l’erreur le désigne. */
  readonly children: (bound: Bound) => ReactNode
}

export type Bound = {
  readonly id: string
  readonly 'aria-invalid': boolean | undefined
  readonly 'aria-describedby': string | undefined
  readonly 'data-wrong': 'true' | undefined
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId()
  const said = error ?? hint
  const saidId = said === undefined ? undefined : `${id}-said`

  const bound: Bound = {
    id,
    'aria-invalid': error === undefined ? undefined : true,
    'aria-describedby': saidId,
    'data-wrong': error === undefined ? undefined : 'true',
  }

  return (
    <div className="basalte-field">
      {label !== undefined && (
        <label className="basalte-label" htmlFor={id}>
          {label}
          {required === true && ' *'}
        </label>
      )}
      {children(bound)}
      {said !== undefined && (
        <span
          id={saidId}
          className="basalte-text"
          data-size={error === undefined ? 'eyebrow' : 'small'}
          data-tone={error === undefined ? 'meta' : 'refused'}
        >
          {said}
        </span>
      )}
    </div>
  )
}

type InputProps = ComponentProps<'input'> & {
  readonly mono?: boolean | undefined
  /** Le filet d’accent d’un texte écrit pour le mobile seul. */
  readonly override?: boolean | undefined
}

export function TextField({ mono, override, className, ...rest }: InputProps) {
  return (
    <input
      className={joined('basalte-input', className)}
      data-mono={mono === true ? 'true' : undefined}
      data-override={override === true ? 'true' : undefined}
      {...rest}
    />
  )
}

type AreaProps = ComponentProps<'textarea'> & {
  readonly override?: boolean | undefined
}

export function TextArea({ override, className, ...rest }: AreaProps) {
  return (
    <textarea
      className={joined('basalte-input', className)}
      data-override={override === true ? 'true' : undefined}
      {...rest}
    />
  )
}

type SelectProps = ComponentProps<'select'> & {
  readonly children: ReactNode
}

/** Un menu déroulant porte le filet d’un champ : il se remplit, il n’agit pas. */
export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <span className="basalte-select">
      <select className={joined('basalte-input', className)} {...rest}>
        {children}
      </select>
      <Chevron />
    </span>
  )
}
