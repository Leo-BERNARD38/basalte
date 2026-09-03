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
// L’écran a la forme de « Édition » — la structure, le formulaire, l’aperçu —
// et n’en a pas le fond : un billet n’a ni sections à choisir, ni ordre à
// régler. On ouvre, on écrit, on enregistre. La structure est la liste des
// billets, et c’est le seul écran d’où le client crée et détruit du contenu.

import { useState } from 'react'

import { formatDate, today } from '../fields/date.js'
import type { ContentIssue } from '../content/report.js'
import type { PanelPayload } from '../server/panel.js'
import type { DraftPost } from '../server/posts.js'
import type { Values } from './draft.js'
import { editedLanguage, previewAddress, useEditing } from './editing.js'
import { issuesOf } from './Edit.js'
import { FieldSet } from './fields/Field.js'
import { Language } from './Language.js'
import { Stage } from './Stage.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { HiddenMark, Plus } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Row, RowStack } from './ui/Row.js'
import { Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'
import { SwitchRow } from './ui/Toggle.js'

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
  issues,
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
  readonly issues: readonly ContentIssue[]
  readonly onSelect: (slug: string) => void
  readonly onDraft: (draft: PostValues) => void
  readonly onCreate: (title: string) => void
  readonly onDelete: (slug: string) => void
}) {
  const editing = useEditing()
  const [writing, setWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [removing, setRemoving] = useState<DraftPost | undefined>(undefined)

  const journal = payload.journal

  if (journal === undefined) {
    return <Text tone="muted">Ce site n’a pas de journal.</Text>
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
      <div className="basalte-structure">
        <Card pad="sm">
          <Stack gap="md">
            <Button variant="filled" block onClick={() => setWriting(true)}>
              <Plus />
              Nouveau billet
            </Button>

            <Language />

            <Group gap="md" align="baseline" className="basalte-aside__head">
              <Title role="title-md">Billets</Title>
              <Spacer />
              <Text tone="meta" role="label-md">
                {posts.length}
              </Text>
            </Group>

            <Stack gap="hair">
              {posts.map((post) => {
                const away = post.hidden[editing.language] === true

                return (
                  <Row
                    key={post.slug}
                    current={post.slug === selected}
                    hidden={away}
                    onClick={() => onSelect(post.slug)}
                  >
                    <RowStack>
                      <span>{post.title}</span>
                      <Mono className="basalte-row__note">
                        {formatDate(post.date, editing.language)}
                      </Mono>
                    </RowStack>
                    {away && (
                      <Mark hatched>
                        <HiddenMark size={12} />
                        brouillon
                      </Mark>
                    )}
                  </Row>
                )
              })}
            </Stack>

            {posts.length === 0 && (
              <Empty title="Aucun billet" note="Le premier s’écrit maintenant.">
                <Button size="sm" onClick={() => setWriting(true)}>
                  Nouveau billet
                </Button>
              </Empty>
            )}
          </Stack>
        </Card>
      </div>

      <div className="basalte-form">
        <Card>
          {open === undefined ? (
            <Empty
              title="Rien à modifier"
              note="Choisissez un billet à gauche, ou écrivez-en un."
            />
          ) : (
            <Stack gap="xl">
              <Stack gap="xs">
                <Eyebrow>
                  {[open.route, editedLanguage(editing)]
                    .filter((part) => part !== undefined)
                    .join(' · ')}
                </Eyebrow>
                <Title role="title-md">{open.title}</Title>
              </Stack>

              <Stack gap="sm">
                <SwitchRow
                  on={!hidden}
                  label="Le billet paraît sur le site"
                  onChange={() =>
                    onDraft({
                      ...draft,
                      hidden: { ...draft.hidden, [editing.language]: !hidden },
                    })
                  }
                />
                <Text tone="meta" role="label-md">
                  {hidden
                    ? 'Masqué : ce billet ne partira pas à la prochaine mise en ligne.'
                    : 'Ce billet partira à la prochaine mise en ligne.'}
                </Text>
              </Stack>

              <FieldSet
                descriptions={journal.fields}
                values={draft.fields}
                issues={issuesOf(issues, undefined)}
                onChange={(fields) => onDraft({ ...draft, fields })}
              />

              <Group>
                <Button
                  variant="text"
                  tone="error"
                  disabled={busy}
                  onClick={() => setRemoving(open)}
                >
                  Supprimer ce billet
                </Button>
              </Group>
            </Stack>
          )}
        </Card>
      </div>

      <Stage
        address={
          open === undefined
            ? undefined
            : (support) => previewAddress(open.route, editing, support)
        }
        stale={open !== undefined && dirty}
        frameKey={`${savedAt ?? 0}-${open?.slug ?? ''}`}
        title="Aperçu du billet"
        empty={
          <Empty
            title="Aucun billet ouvert"
            note="Choisissez-en un à gauche, ou écrivez-en un."
          />
        }
      />

      <Modal
        opened={writing}
        title="Nouveau billet"
        onClose={() => setWriting(false)}
        foot={
          <>
            <Spacer />
            <Button onClick={() => setWriting(false)}>Annuler</Button>
            <Button
              variant="filled"
              disabled={title.trim() === ''}
              onClick={compose}
            >
              Écrire
            </Button>
          </>
        }
      >
        <Stack gap="lg">
          <Field
            label="Titre"
            hint="Il fait l’adresse du billet, et ne changera plus ensuite."
          >
            {(bound) => (
              <TextField
                {...bound}
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                onKeyDown={(event) => event.key === 'Enter' && compose()}
              />
            )}
          </Field>
          <Text tone="muted">
            Le billet est créé masqué, daté du {formatDate(today(), 'fr')}. Vous
            le mettez en ligne quand il est prêt.
          </Text>
        </Stack>
      </Modal>

      <Modal
        opened={removing !== undefined}
        title="Supprimer ce billet"
        onClose={() => setRemoving(undefined)}
        foot={
          <>
            <Spacer />
            <Button onClick={() => setRemoving(undefined)}>Le garder</Button>
            <Button
              variant="text"
              tone="error"
              onClick={() => {
                const slug = removing?.slug

                setRemoving(undefined)

                if (slug !== undefined) onDelete(slug)
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <Text>
          « {removing?.title} » sera retiré du site et du dépôt. Son adresse ne
          mènera plus nulle part.
        </Text>
      </Modal>
    </div>
  )
}
