// Un champ image ne porte qu’une clé de la médiathèque : le rendu y trouve les
// largeurs, le texte alternatif et le point focal. Le client, lui, ne voit que
// la vignette et le bouton qui ouvre la médiathèque.
//
// La vignette est elle-même le bouton : c’est l’image qu’on vise du regard, et
// « Remplacer » reste à côté pour qui parcourt l’écran au clavier.

import { translated } from '../draft.js'
import { useEditing } from '../editing.js'
import { thumbnail } from '../Media.js'
import { Button } from '../ui/Button.js'
import { Field } from '../ui/Field.js'
import { Picture } from '../ui/icons.js'
import { Group, Spacer, Stack } from '../ui/Layout.js'
import { Text } from '../ui/Text.js'
import { hint, useFieldError, type ControlProps } from './Field.js'

export function ImageControl({
  description,
  value,
  issues,
  onChange,
}: ControlProps) {
  const error = useFieldError(issues)
  const editing = useEditing()
  const key = typeof value === 'string' ? value : ''
  const entry = editing.media.find((item) => item.key === key)

  // Le format attendu est déclaré par le champ : il n’est connu qu’ici, et
  // c’est lui qui décide de ce que la médiathèque propose. Le cadrage, lui, se
  // règle au point focal, dans la médiathèque.
  const choose = async () => {
    const chosen = await editing.pickImage(key, description.ratio)

    if (chosen !== undefined) onChange(chosen)
  }

  return (
    <Field
      label={description.label}
      hint={hint(description)}
      error={error}
      required={description.required}
      group
    >
      {(bound) => (
        <Stack gap="sm" {...bound}>
          {entry === undefined ? (
            <div className="basalte-slot">
              <Picture />
              Aucune image
              {description.ratio === undefined
                ? ''
                : ` — proportions attendues ${description.ratio}`}
            </div>
          ) : (
            <button
              type="button"
              className="basalte-tile basalte-tile--field"
              aria-label="Remplacer l’image"
              onClick={choose}
            >
              <img
                className="basalte-tile__image"
                src={thumbnail(entry)}
                alt={translated(entry.alt, editing.language)}
              />
            </button>
          )}

          <Group gap="sm">
            {entry !== undefined && (
              <Text tone="meta" role="label-md">
                {translated(entry.alt, editing.language) || 'Sans description'}
              </Text>
            )}
            <Spacer />
            <Button size="xs" onClick={choose}>
              {entry === undefined ? 'Choisir' : 'Remplacer'}
            </Button>
            {entry !== undefined && !description.required && (
              <Button
                variant="text"
                tone="error"
                size="xs"
                onClick={() => onChange('')}
              >
                Retirer
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Field>
  )
}
