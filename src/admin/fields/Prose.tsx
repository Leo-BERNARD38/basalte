// Les trois champs qui portent du texte. Ce sont les seuls que le DSL déclare
// traduisibles, et donc les seuls qui lisent la langue affichée : tout le reste
// du panel l’ignore.
//
// L’aperçu du Markdown restreint passe par la fonction du socle, celle-là même
// qui rend le site, et reçoit la grammaire déclarée par le champ : le client
// voit ce que la page affichera, et aucune balise ne peut venir du texte saisi
// (invariant 1).

import { Textarea, TextInput } from '@mantine/core'

import { renderRichtext } from '../../fields/richtext.js'
import { translated, withLanguage } from '../draft.js'
import { useEditing } from '../editing.js'
import { hint, type ControlProps } from './Field.js'

const ROWS = 4

const INLINE = '**gras**, *italique*, [lien](https://exemple.fr)'

export function Prose({ description, value, onChange }: ControlProps) {
  const editing = useEditing()

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

  const shared = {
    label: description.label,
    description: hint(description, text.length),
    required: description.required,
    value: text,
    ...(description.max === undefined ? {} : { maxLength: description.max }),
    onChange: (event: { currentTarget: { value: string } }) =>
      change(event.currentTarget.value),
  }

  if (description.kind === 'text') return <TextInput {...shared} />

  if (description.kind === 'textarea') {
    return <Textarea {...shared} autosize minRows={description.rows ?? ROWS} />
  }

  const placeholder = [
    ...(description.headings === true ? ['## titre'] : []),
    ...(description.lists === true ? ['- élément'] : []),
    INLINE,
  ].join(', ')

  return (
    <div>
      <Textarea {...shared} autosize minRows={ROWS} placeholder={placeholder} />
      {text.trim() !== '' && (
        <div
          className="basalte-markdown"
          dangerouslySetInnerHTML={{
            __html: renderRichtext(text, description),
          }}
        />
      )}
    </div>
  )
}
