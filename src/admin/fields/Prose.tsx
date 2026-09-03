// Les trois champs qui portent du texte. Ce sont les seuls que le DSL déclare
// traduisibles, et donc les seuls qui lisent la langue affichée : tout le reste
// du panel l’ignore.
//
// L’aperçu du Markdown restreint passe par la fonction du socle, celle-là même
// qui rend le site, et reçoit la grammaire déclarée par le champ : le client
// voit ce que la page affichera, et aucune balise ne peut venir du texte saisi
// (invariant 1).
//
// Le compteur vit au bout de la ligne d’aide, à droite, et non entre le champ
// et elle : posé entre les deux, il se lisait comme le début de la phrase
// d’aide. Il ne se colore qu’en approchant de la borne — une valeur qui ne
// bouge pas n’a rien à signaler.

import { renderRichtext } from '../../fields/richtext.js'
import { translated, withLanguage } from '../draft.js'
import { useEditing } from '../editing.js'
import { Field, TextArea, TextField, type Bound } from '../ui/Field.js'
import { Text } from '../ui/Text.js'
import { hint, useFieldError, type ControlProps } from './Field.js'

const ROWS = 4

/** La marge sous laquelle le compteur se met à prévenir. */
const CLOSE = 0.9

const INLINE = '**gras**, *italique*, [lien](https://exemple.fr)'

export function Prose({ description, value, issues, onChange }: ControlProps) {
  const editing = useEditing()
  const error = useFieldError(issues)

  const text = description.i18n
    ? translated(value, editing.language)
    : typeof value === 'string'
      ? value
      : ''

  const change = (next: string) => {
    onChange(
      description.i18n ? withLanguage(value, editing.language, next) : next,
    )
  }

  const rows =
    description.kind === 'textarea' ? (description.rows ?? ROWS) : ROWS

  // La grammaire déclarée par le champ, montrée par l’exemple : ce qu’on peut
  // écrire ici se lit plus vite qu’il ne s’explique.
  const placeholder = [
    ...(description.headings === true ? ['## titre'] : []),
    ...(description.lists === true ? ['- élément'] : []),
    INLINE,
  ].join(', ')

  const control = (bound: Bound) =>
    description.kind === 'text' ? (
      <TextField
        {...bound}
        value={text}
        maxLength={description.max}
        onChange={(event) => change(event.target.value)}
      />
    ) : (
      <TextArea
        {...bound}
        rows={rows}
        value={text}
        maxLength={description.max}
        {...(description.kind === 'richtext' ? { placeholder } : {})}
        onChange={(event) => change(event.target.value)}
      />
    )

  const counter =
    description.max === undefined ? undefined : (
      <Text
        role="label-md"
        tone={text.length >= description.max * CLOSE ? 'strong' : 'meta'}
      >
        {text.length} / {description.max}
        {text.length >= description.max ? ' — c’est le maximum' : ''}
      </Text>
    )

  const preview =
    description.kind === 'richtext' && text.trim() !== '' ? (
      <div
        className="basalte-markdown"
        dangerouslySetInnerHTML={{
          __html: renderRichtext(text, description),
        }}
      />
    ) : undefined

  return (
    <Field
      label={description.label}
      hint={hint(description)}
      error={error}
      required={description.required}
      foot={counter}
      after={preview}
    >
      {control}
    </Field>
  )
}
