// L’écran « Actualités » : la liste des billets, le formulaire de celui qui est
// ouvert, et son aperçu.
//
// C’est le sixième écran, et il en fallait un. D63 refusait le sixième parce
// que « Réglages » était vide ; un journal ne l’est pas, et `panel.md` fait
// suivre la hiérarchie du panel à la fréquence d’usage : qui poste tous les
// jours vient ici plus souvent que partout ailleurs. Le sélecteur de
// « Édition » ne pouvait pas l’accueillir — c’est un menu déroulant, et il
// devient inutilisable à trente entrées.
//
// L’écran ne ressemble pas à « Édition », et c’est le fond de la chose : un
// billet n’a ni sections à choisir, ni ordre à régler. On ouvre, on écrit, on
// enregistre.

import {
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core'
import { useState } from 'react'

import { formatDate, today } from '../fields/date.js'
import type { DraftPost } from '../server/posts.js'
import type { PanelPayload } from '../server/panel.js'
import type { Values } from './draft.js'
import { previewAddress, useEditing } from './editing.js'
import { FieldSet } from './fields/Field.js'
import { HiddenMark } from './HiddenMark.js'

export type PostValues = {
  readonly hidden: Readonly<Record<string, boolean>>
  readonly fields: Values
}

export function Journal({
  payload,
  selected,
  draft,
  savedAt,
  dirty,
  busy,
  onSelect,
  onDraft,
  onCreate,
  onDelete,
}: {
  readonly payload: PanelPayload
  readonly selected: string
  readonly draft: PostValues
  readonly savedAt: number | undefined
  readonly dirty: boolean
  readonly busy: boolean
  readonly onSelect: (slug: string) => void
  readonly onDraft: (draft: PostValues) => void
  readonly onCreate: (title: string) => void
  readonly onDelete: (slug: string) => void
}) {
  const editing = useEditing()
  const [viewport, setViewport] = useState<string>('desktop')
  const [writing, setWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [removing, setRemoving] = useState<DraftPost | undefined>(undefined)

  const journal = payload.journal

  if (journal === undefined) {
    return <Text c="dimmed">Ce site n’a pas de journal.</Text>
  }

  const posts = journal.posts
  const open = posts.find((post) => post.slug === selected)
  const hidden = draft.hidden[editing.language] === true

  const compose = () => {
    const wanted = title.trim()

    if (wanted === '') return

    setWriting(false)
    setTitle('')
    onCreate(wanted)
  }

  return (
    <div className="basalte-edit">
      <Paper className="basalte-rail" p="md">
        <Stack gap="sm">
          <Button size="sm" onClick={() => setWriting(true)}>
            Nouveau billet
          </Button>

          <Group justify="space-between" align="center" px={12}>
            <span className="basalte-eyebrow">Billets</span>
            <Text size="sm" fw={700} c="dimmed">
              {posts.length}
            </Text>
          </Group>

          <Stack gap={2}>
            {posts.map((post) => {
              const hidden = post.hidden[editing.language] === true

              return (
                <div
                  key={post.slug}
                  className="basalte-section-row"
                  data-fixed="true"
                  data-current={post.slug === selected}
                  data-hidden={hidden}
                >
                  <button
                    type="button"
                    className="basalte-section-row__label"
                    aria-current={post.slug === selected}
                    onClick={() => onSelect(post.slug)}
                  >
                    <span className="basalte-section-row__text">
                      {post.title}
                    </span>
                    <span className="basalte-post-date">
                      {formatDate(post.date, editing.language)}
                    </span>
                    {hidden && <HiddenMark />}
                  </button>
                </div>
              )
            })}
          </Stack>

          {posts.length === 0 && (
            <div className="basalte-empty">
              Aucun billet pour l’instant. « Nouveau billet » en écrit un.
            </div>
          )}

          <Text size="sm" c="dimmed" px={12}>
            Un billet masqué reste ici et ne part pas en ligne. C’est ce qui
            permet de l’écrire en plusieurs fois.
          </Text>
        </Stack>
      </Paper>

      <div className="basalte-stage">
        <div className="basalte-stage__head">
          <Text fz="var(--panel-text-title)" fw={700}>
            Aperçu
          </Text>
          <SegmentedControl
            size="xs"
            radius="xl"
            ml="auto"
            value={viewport}
            onChange={setViewport}
            data={[
              { value: 'desktop', label: 'Bureau' },
              { value: 'mobile', label: 'Mobile' },
            ]}
          />
        </div>

        {open === undefined ? (
          <div className="basalte-empty">
            Choisissez un billet à gauche, ou écrivez-en un.
          </div>
        ) : (
          <>
            {dirty && (
              <Text size="sm" c="dimmed">
                L’aperçu montre le dernier enregistrement. Enregistrez pour le
                voir se mettre à jour.
              </Text>
            )}

            <iframe
              key={`${savedAt ?? 0}-${viewport}-${open.slug}`}
              className="basalte-stage__frame"
              data-viewport={viewport}
              title="Aperçu du billet"
              src={previewAddress(open.route, editing, viewport)}
            />
          </>
        )}
      </div>

      <Paper className="basalte-inspector" p="md">
        {open === undefined ? (
          <div className="basalte-empty">Aucun billet ouvert.</div>
        ) : (
          <Stack gap="md">
            <div>
              <Text fz="var(--panel-text-title)" fw={700}>
                {open.title}
              </Text>
              <Text size="sm" c="dimmed">
                {open.route}
              </Text>
            </div>

            <Switch
              checked={!hidden}
              label={hidden ? 'Masqué' : 'En ligne'}
              description={
                hidden
                  ? 'Ce billet ne partira pas en ligne à la prochaine mise en ligne.'
                  : 'Ce billet partira en ligne à la prochaine mise en ligne.'
              }
              onChange={(event) =>
                onDraft({
                  ...draft,
                  hidden: {
                    ...draft.hidden,
                    [editing.language]: !event.currentTarget.checked,
                  },
                })
              }
            />

            <FieldSet
              descriptions={journal.fields}
              values={draft.fields}
              onChange={(fields) => onDraft({ ...draft, fields })}
            />

            <Button
              variant="subtle"
              color="red"
              size="sm"
              disabled={busy}
              onClick={() => setRemoving(open)}
            >
              Supprimer ce billet
            </Button>
          </Stack>
        )}
      </Paper>

      <Modal
        opened={writing}
        onClose={() => setWriting(false)}
        title="Nouveau billet"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Titre"
            description="Il fait l’adresse du billet, et ne changera plus ensuite."
            value={title}
            data-autofocus
            onChange={(event) => setTitle(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && compose()}
          />
          <Text size="sm" c="dimmed">
            Le billet est créé masqué, daté du {formatDate(today(), 'fr')}. Vous
            le mettez en ligne quand il est prêt.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setWriting(false)}>
              Annuler
            </Button>
            <Button disabled={title.trim() === ''} onClick={compose}>
              Écrire
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={removing !== undefined}
        onClose={() => setRemoving(undefined)}
        title="Supprimer ce billet"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            « {removing?.title} » sera retiré du site et du dépôt. Son adresse
            ne mènera plus nulle part.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoving(undefined)}>
              Le garder
            </Button>
            <Button
              color="red"
              onClick={() => {
                const slug = removing?.slug

                setRemoving(undefined)

                if (slug !== undefined) onDelete(slug)
              }}
            >
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
