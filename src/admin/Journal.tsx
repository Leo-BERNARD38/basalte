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
// enregistre. Trois colonnes le disent : les billets, celui qu’on écrit, et ce
// qu’il donnera.

import { useState } from 'react'

import { formatDate, today } from '../fields/date.js'
import type { ContentIssue } from '../content/report.js'
import type { PanelPayload } from '../server/panel.js'
import type { DraftPost } from '../server/posts.js'
import type { Values } from './draft.js'
import { editedLanguage, previewAddress, useEditing } from './editing.js'
import { issuesOf } from './Edit.js'
import { FieldSet } from './fields/Field.js'
import { Mark } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { Desktop, HiddenMark, Mobile, Plus } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Row, RowStack } from './ui/Row.js'
import { Card, Empty } from './ui/Surface.js'
import { Eyebrow, Mono, Text, Title } from './ui/Text.js'
import { Segmented, Switch } from './ui/Toggle.js'

type Viewport = 'desktop' | 'mobile'

const SUPPORTS = [
  {
    value: 'desktop' as const,
    label: (
      <>
        <Desktop />
        Bureau
      </>
    ),
  },
  {
    value: 'mobile' as const,
    label: (
      <>
        <Mobile />
        Mobile
      </>
    ),
  },
]

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
  const [viewport, setViewport] = useState<Viewport>('desktop')
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
    <div className="basalte-journal">
      <Card pad="sm">
        <Stack gap="md">
          <Button tone="ink" block onClick={() => setWriting(true)}>
            <Plus />
            Nouveau billet
          </Button>

          <Group gap="md" align="baseline" className="basalte-rail__head">
            <Title rank="card">Billets</Title>
            <Spacer />
            <Mono className="basalte-row__note">{posts.length}</Mono>
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

      <Card>
        {open === undefined ? (
          <Empty
            title="Rien à modifier"
            note="Choisissez un billet à gauche, ou écrivez-en un."
          />
        ) : (
          <Stack gap="xl">
            <Group gap="md" align="start">
              <Stack gap="xs">
                <Eyebrow>
                  {[open.route, editedLanguage(editing)]
                    .filter((part) => part !== undefined)
                    .join(' · ')}
                </Eyebrow>
                <Title rank="card">{open.title}</Title>
              </Stack>
              <Spacer />
              <Switch
                on={!hidden}
                label="Le billet paraît sur le site"
                onChange={() =>
                  onDraft({
                    ...draft,
                    hidden: { ...draft.hidden, [editing.language]: !hidden },
                  })
                }
              />
            </Group>

            <Text tone="meta" size="small">
              {hidden
                ? 'Masqué : ce billet ne partira pas à la prochaine mise en ligne.'
                : 'Ce billet partira à la prochaine mise en ligne.'}
            </Text>

            <FieldSet
              descriptions={journal.fields}
              values={draft.fields}
              issues={issuesOf(issues, undefined)}
              onChange={(fields) => onDraft({ ...draft, fields })}
            />

            <Group>
              <Button
                tone="danger"
                disabled={busy}
                onClick={() => setRemoving(open)}
              >
                Supprimer ce billet
              </Button>
            </Group>
          </Stack>
        )}
      </Card>

      <div className="basalte-stage">
        <Group gap="md">
          <Eyebrow>aperçu du billet</Eyebrow>
          <Spacer />
          <Segmented
            tone="ink"
            label="Le support regardé"
            value={viewport}
            items={SUPPORTS}
            onChange={setViewport}
          />
        </Group>

        {open === undefined ? (
          <Empty
            title="Aucun billet ouvert"
            note="Choisissez-en un à gauche, ou écrivez-en un."
          />
        ) : (
          <>
            {dirty && (
              <Text tone="meta" size="small">
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

      <Modal
        opened={writing}
        title="Nouveau billet"
        onClose={() => setWriting(false)}
        foot={
          <>
            <Spacer />
            <Button onClick={() => setWriting(false)}>Annuler</Button>
            <Button tone="ink" disabled={title.trim() === ''} onClick={compose}>
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
              tone="danger"
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
