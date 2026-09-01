// Les trois champs qui portent du texte. Ce sont les seuls que le DSL déclare
// traduisibles, et donc les seuls qui lisent la langue affichée : tout le reste
// du panel l’ignore.
//
// L’aperçu du Markdown restreint passe par la fonction du socle, celle-là même
// qui rend le site, et reçoit la grammaire déclarée par le champ : le client
// voit ce que la page affichera, et aucune balise ne peut venir du texte saisi
// (invariant 1).
//
// Le compteur vit sous le champ, à droite, et non dans la phrase d’aide : il y
// était collé au même gris, si bien qu’une aide et une mesure se lisaient comme
// une seule ligne. Il ne se colore qu’en approchant de la borne — une valeur
// qui ne bouge pas n’a rien à signaler.

import { Group, Text, Textarea, TextInput } from '@mantine/core'

import { renderRichtext } from '../../fields/richtext.js'
import { translated, withLanguage } from '../draft.js'
import { useEditing } from '../editing.js'
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

  const shared = {
    label: description.label,
    description: hint(description),
    required: description.required,
    error,
    value: text,
    ...(description.max === undefined ? {} : { maxLength: description.max }),
    onChange: (event: { currentTarget: { value: string } }) =>
      change(event.currentTarget.value),
  }

  const counter =
    description.max === undefined ? undefined : (
      <Group justify="flex-end" mt={4}>
        <Text
          size="xs"
          c={text.length >= description.max * CLOSE ? 'orange' : 'dimmed'}
        >
          {text.length} / {description.max}
          {text.length >= description.max ? ' — c’est le maximum' : ''}
        </Text>
      </Group>
    )

  if (description.kind === 'text') {
    return (
      <div>
        <TextInput {...shared} />
        {counter}
      </div>
    )
  }

  if (description.kind === 'textarea') {
    return (
      <div>
        <Textarea {...shared} autosize minRows={description.rows ?? ROWS} />
        {counter}
      </div>
    )
  }

  const placeholder = [
    ...(description.headings === true ? ['## titre'] : []),
    ...(description.lists === true ? ['- élément'] : []),
    INLINE,
  ].join(', ')

  return (
    <div>
      <Textarea {...shared} autosize minRows={ROWS} placeholder={placeholder} />
      {counter}
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
