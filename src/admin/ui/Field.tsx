// Le champ, et ce qui l’entoure : son libellé, son aide, et l’erreur qui le
// désigne. C’est ici que se tient l’affichage d’un refus de validation (D166)
// — une phrase posée ailleurs oblige à relire l’écran pour retrouver lequel.
//
// Le champ garde l’arête : une colonne de formulaire se lit sur un axe
// vertical net. Le focus noircit le filet et pose l’anneau à côté.

import { useId, type ComponentProps, type ReactNode } from 'react'

import { Chevron } from './icons.js'
import { joined } from './Layout.js'

type FieldProps = {
  readonly label?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly required?: boolean | undefined
  /**
   * Le contrôle n’est pas un élément étiquetable mais un ensemble — une
   * vignette et deux boutons, une liste d’éléments. Le libellé cesse alors de
   * le viser par `for`, qui ne désigne qu’un contrôle, et le nomme.
   */
  readonly group?: boolean | undefined
  /**
   * Ce que le pied du champ porte à droite de l’aide : un compteur. Sur la
   * même ligne que l’aide, et non entre le contrôle et elle — posé entre les
   * deux, il se lisait comme le début de la phrase d’aide.
   */
  readonly foot?: ReactNode | undefined
  /** Ce qui suit le pied du champ : l’aperçu d’un texte mis en forme. */
  readonly after?: ReactNode | undefined
  /** Reçoit ce qu’un contrôle doit porter pour que l’erreur le désigne. */
  readonly children: (bound: Bound) => ReactNode
}

export type Bound = {
  readonly id: string
  readonly role?: 'group' | undefined
  readonly 'aria-labelledby'?: string | undefined
  readonly 'aria-invalid': boolean | undefined
  readonly 'aria-describedby': string | undefined
  readonly 'data-wrong': 'true' | undefined
}

export function Field({
  label,
  hint,
  error,
  required,
  group,
  foot,
  after,
  children,
}: FieldProps) {
  const id = useId()
  const said = error ?? hint
  const saidId = said === undefined ? undefined : `${id}-said`
  const labelId = `${id}-label`

  const bound: Bound = {
    id,
    ...(group === true
      ? { role: 'group' as const, 'aria-labelledby': labelId }
      : {}),
    'aria-invalid': error === undefined ? undefined : true,
    'aria-describedby': saidId,
    'data-wrong': error === undefined ? undefined : 'true',
  }

  return (
    <div className="basalte-field">
      {label !== undefined &&
        (group === true ? (
          <span className="basalte-label" id={labelId}>
            {label}
            {required === true && ' *'}
          </span>
        ) : (
          <label className="basalte-label" htmlFor={id}>
            {label}
            {required === true && ' *'}
          </label>
        ))}
      {children(bound)}
      {(said !== undefined || foot !== undefined) && (
        <span className="basalte-field__foot">
          {said !== undefined && (
            <span
              id={saidId}
              className="basalte-text"
              data-tone={error === undefined ? 'meta' : 'refused'}
            >
              {said}
            </span>
          )}
          {foot !== undefined && (
            <span className="basalte-field__meta">{foot}</span>
          )}
        </span>
      )}
      {after}
    </div>
  )
}

type InputProps = ComponentProps<'input'> & {
  readonly mono?: boolean | undefined
  /** Le filet d’un texte écrit pour le mobile seul. */
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
