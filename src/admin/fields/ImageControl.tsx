// Un champ image ne porte qu’une clé de la médiathèque : le rendu y trouve les
// largeurs, le texte alternatif et le point focal. Le client, lui, ne voit que
// la vignette et le bouton qui ouvre la médiathèque.

import { Button, Group, Image, Input, Paper, Text } from '@mantine/core'

import { matchesRatio } from '../../media/ratio.js'
import { translated } from '../draft.js'
import { useEditing } from '../editing.js'
import { thumbnail } from '../Media.js'
import { hint, type ControlProps } from './Field.js'

const THUMBNAIL = 96

export function ImageControl({ description, value, onChange }: ControlProps) {
  const editing = useEditing()
  const key = typeof value === 'string' ? value : ''
  const entry = editing.media.find((item) => item.key === key)

  // Le format attendu est déclaré par le champ : il n’est connu qu’ici, et
  // c’est lui qui décide de ce que la médiathèque propose.
  const fits =
    description.ratio === undefined ||
    entry === undefined ||
    matchesRatio(entry, description.ratio)

  const choose = async () => {
    const chosen = await editing.pickImage(key, description.ratio)

    if (chosen !== undefined) onChange(chosen)
  }

  return (
    <Input.Wrapper
      label={description.label}
      description={hint(description)}
      required={description.required}
    >
      <Paper p="xs" mt={4}>
        <Group wrap="nowrap" align="center">
          {entry === undefined ? (
            <Text c="dimmed" size="sm" style={{ flex: 1 }}>
              Aucune image
              {description.ratio === undefined
                ? ''
                : ` — proportions attendues ${description.ratio}`}
            </Text>
          ) : (
            <>
              <Image
                w={THUMBNAIL}
                h={THUMBNAIL}
                fit="cover"
                radius="sm"
                src={thumbnail(entry)}
                alt={translated(entry.alt, editing.language)}
              />
              <div style={{ flex: 1 }}>
                <Text size="sm" lineClamp={2}>
                  {translated(entry.alt, editing.language) ||
                    'Sans description'}
                </Text>
                {!fits && (
                  <Text size="xs" c="orange">
                    Pas au format {description.ratio} — à recadrer
                  </Text>
                )}
              </div>
            </>
          )}
          <Group gap="xs" wrap="nowrap">
            <Button variant="default" size="xs" onClick={choose}>
              {entry === undefined ? 'Choisir' : 'Remplacer'}
            </Button>
            {entry !== undefined && !description.required && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => onChange('')}
              >
                Retirer
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Input.Wrapper>
  )
}
