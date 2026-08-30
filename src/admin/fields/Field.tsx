// L’aiguillage d’un champ vers son composant. C’est la seule table du panel
// qui connaisse les types du DSL : ajouter un type à `f.*` demande un
// composant et une ligne ici, jamais une modification des écrans.

import type { ComponentType } from 'react'

import type { FieldDescription } from '../../fields/describe.js'
import type { FieldKind } from '../../fields/types.js'
import type { Values } from '../draft.js'
import { Choice, Link } from './Choice.js'
import { DocumentControl } from './DocumentControl.js'
import { GroupControl } from './GroupControl.js'
import { ImageControl } from './ImageControl.js'
import { ListControl } from './ListControl.js'
import { Prose } from './Prose.js'

export type ControlProps = {
  readonly description: FieldDescription
  readonly value: unknown
  readonly onChange: (value: unknown) => void
}

const CONTROLS: Readonly<Record<FieldKind, ComponentType<ControlProps>>> = {
  text: Prose,
  textarea: Prose,
  richtext: Prose,
  image: ImageControl,
  document: DocumentControl,
  url: Link,
  select: Choice,
  group: GroupControl,
  list: ListControl,
}

export function Field(props: ControlProps) {
  const Control = CONTROLS[props.description.kind]

  return <Control {...props} />
}

export function FieldSet({
  descriptions,
  values,
  onChange,
}: {
  readonly descriptions: readonly FieldDescription[]
  readonly values: Values
  readonly onChange: (values: Values) => void
}) {
  return descriptions.map((description) => (
    <Field
      key={description.name}
      description={description}
      value={values[description.name]}
      onChange={(value) => onChange({ ...values, [description.name]: value })}
    />
  ))
}

/** Le libellé, la phrase d’aide et la borne, réunis sous le champ. */
export function hint(
  description: FieldDescription,
  length?: number,
): string | undefined {
  const parts: string[] = []

  if (description.help !== undefined) parts.push(description.help)

  if (description.max !== undefined && length !== undefined) {
    parts.push(`${length} / ${description.max}`)
  }

  return parts.length === 0 ? undefined : parts.join(' · ')
}
