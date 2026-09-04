// L’aiguillage d’un champ vers son composant. C’est la seule table du panel
// qui connaisse les types du DSL : ajouter un type à `f.*` demande un
// composant et une ligne ici, jamais une modification des écrans.

import type { ComponentType } from 'react'

import type { FieldDescription } from '../../fields/describe.js'
import type { FieldKind } from '../../fields/types.js'
import type { Values } from '../draft.js'
import { languageLabel, useEditing } from '../editing.js'
import { Choice, Link, Moment } from './Choice.js'
import { DocumentControl } from './DocumentControl.js'
import { GroupControl } from './GroupControl.js'
import { ImageControl } from './ImageControl.js'
import { ListControl } from './ListControl.js'
import { Prose } from './Prose.js'

/**
 * Ce qui bloque un enregistrement, tel qu’un champ le reçoit : le chemin est
 * relatif à lui, chaque niveau en retirant le segment qu’il porte. Le serveur
 * sait déjà quelle section, quel champ et quelle langue (D166) — l’aplatir en
 * phrases obligeait le client à relire son écran pour retrouver lequel.
 */
export type FieldIssue = {
  readonly path: readonly (string | number)[]
  readonly language?: string
  readonly message: string
}

export type ControlProps = {
  readonly description: FieldDescription
  readonly value: unknown
  readonly issues: readonly FieldIssue[]
  readonly onChange: (value: unknown) => void
}

/** Les incidents d’un champ, leur chemin amputé du segment qu’il portait. */
export function below(
  issues: readonly FieldIssue[],
  segment: string | number,
): readonly FieldIssue[] {
  return issues
    .filter((issue) => issue.path[0] === segment)
    .map((issue) => ({ ...issue, path: issue.path.slice(1) }))
}

/**
 * Le message qu’un champ terminal affiche. La langue est nommée dès qu’elle
 * n’est pas celle qu’on a sous les yeux : sans quoi une traduction manquante
 * signale un champ qui, à l’écran, est rempli.
 */
export function useFieldError(
  issues: readonly FieldIssue[],
): string | undefined {
  const editing = useEditing()

  if (issues.length === 0) return undefined

  return issues
    .map((issue) =>
      issue.language === undefined || issue.language === editing.language
        ? issue.message
        : `${issue.message} (${languageLabel(editing.languages, issue.language)})`,
    )
    .join(' · ')
}

const CONTROLS: Readonly<Record<FieldKind, ComponentType<ControlProps>>> = {
  text: Prose,
  textarea: Prose,
  richtext: Prose,
  image: ImageControl,
  document: DocumentControl,
  date: Moment,
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
  issues = [],
  onChange,
}: {
  readonly descriptions: readonly FieldDescription[]
  readonly values: Values
  readonly issues?: readonly FieldIssue[]
  readonly onChange: (values: Values) => void
}) {
  return descriptions.map((description) => (
    <Field
      key={description.name}
      description={description}
      value={values[description.name]}
      issues={below(issues, description.name)}
      onChange={(value) => onChange({ ...values, [description.name]: value })}
    />
  ))
}
