// L’écran « Actualités » : les billets du journal.
//
// C’est le sixième écran, et il en fallait un. D63 refusait le sixième parce
// que « Réglages » était vide ; un journal ne l’est pas, et `panel.md` fait
// suivre la hiérarchie du panel à la fréquence d’usage : qui poste tous les
// jours vient ici plus souvent que partout ailleurs. Le sélecteur de
// « Édition » ne pouvait pas l’accueillir — c’est un menu déroulant, et il
// devient inutilisable à trente entrées.
//
// L’écran a **deux niveaux**, parce que le client y fait trois gestes et pas
// un de plus : créer un billet, en reprendre un, en supprimer un. Le premier
// niveau est la liste, en pleine largeur : une carte par billet, sa couverture,
// sa date, et l’état de sa parution. Les trois gestes s’y voient d’un coup
// d’œil. Le second est le billet, qui remplace le contenu de l’écran — l’aperçu
// et le volet, exactement la forme de « Édition ».
//
// Ce niveau ne couvre pas la barre d’application : « Enregistrer » et « Mettre
// en ligne » restent à la même place que sur les cinq autres écrans (D214), et
// rien n’est dupliqué. Un billet, lui, n’a ni sections ni ordre : son volet ne
// porte que ses champs, sa parution et sa suppression.

import { useState } from 'react'

import type { ContentIssue } from '../content/report.js'
import { formatDate, today } from '../fields/date.js'
import { POST_SECTION } from '../journal/page.js'
import type { PanelPayload } from '../server/panel.js'
import type { DraftPost } from '../server/posts.js'
import type { Values } from './draft.js'
import { previewAddress, useEditing } from './editing.js'
import { FieldSet, issuesOf } from './fields/Field.js'
import { Inspector } from './Inspector.js'
import { Language } from './Language.js'
import { PostCard } from './PostCard.js'
import { Stage } from './Stage.js'
import { Button, Fab, IconButton } from './ui/Button.js'
import { Field, TextField } from './ui/Field.js'
import { ArrowBack, Edit, Add } from './ui/icons.js'
import { Group, Spacer, Stack } from './ui/Layout.js'
import { Modal } from './ui/Overlay.js'
import { Card, CardBody, CardHead, Empty } from './ui/Surface.js'
import { Mono, plural, Text, Title } from './ui/Text.js'
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
  /** Vrai quand on écrit un billet : le second niveau couvre la liste. */
  const [opened, setOpened] = useState(false)
  /** Le volet du billet : déployé, et refermable quand il vient en couche. */
  const [panel, setPanel] = useState(true)

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
    setOpened(true)
    setPanel(true)
    onCreate(wanted)
  }

  // Ouvrir un billet peut demander confirmation, quand un autre porte des
  // modifications : le second niveau ne s’ouvre alors que sur celui qui reste.
  const write = (slug: string) => {
    setOpened(true)
    setPanel(true)
    onSelect(slug)
  }

  return (
    <div className="basalte-journal">
      <Card fill>
        <CardHead>
          <Title role="title-md">Billets</Title>
          <Text tone="meta" role="label-md">
            {posts.length} {plural(posts.length, 'billet')}
          </Text>
          <Spacer />
          <Button
            variant="filled"
            icon={<Add />}
            onClick={() => setWriting(true)}
          >
            Nouveau billet
          </Button>
        </CardHead>

        <CardBody>
          {posts.length === 0 ? (
            <Empty title="Aucun billet" note="Le premier s’écrit maintenant.">
              <Button size="sm" onClick={() => setWriting(true)}>
                Nouveau billet
              </Button>
            </Empty>
          ) : (
            <div className="basalte-posts">
              {posts.map((post) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  media={editing.media}
                  away={post.hidden[editing.language] === true}
                  language={editing.language}
                  onWrite={() => write(post.slug)}
                  onRemove={() => setRemoving(post)}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Le second niveau : le billet ouvert, avec la même forme que l’écran
          d’édition. Il ne se démonte pas d’un écran à l’autre — c’est la
          feuille qui le montre, et l’aperçu garde son cadre. */}
      <div className="basalte-writer" data-open={String(opened)}>
        <div className="basalte-writer__head">
          <IconButton
            label="Revenir aux billets"
            onClick={() => setOpened(false)}
          >
            <ArrowBack />
          </IconButton>
          <Title role="title-md">{open?.title ?? 'Billet'}</Title>
          {open !== undefined && (
            <Mono className="basalte-row__note">{open.route}</Mono>
          )}
        </div>

        <div className="basalte-writer__body">
          <Stage
            address={
              open === undefined
                ? undefined
                : (support) => previewAddress(open.route, editing, support)
            }
            // Un billet compilé n’a qu’une section : la viser amène le corps
            // en vue, plutôt que d’ouvrir sur l’en-tête et la couverture.
            selection={POST_SECTION}
            stale={open !== undefined && dirty}
            frameKey={`${savedAt ?? 0}-${open?.slug ?? ''}`}
            title="Aperçu du billet"
            empty={
              <Empty
                title="Aucun billet ouvert"
                note="Revenez à la liste pour en choisir un."
              />
            }
          />

          <Fab
            className="basalte-inspector__open"
            extended
            label="Le billet"
            icon={<Edit size={18} />}
            onClick={() => setPanel(true)}
          />

          <Inspector
            opened={panel}
            onClose={() => setPanel(false)}
            head={
              <>
                <Title role="title-md">Le billet</Title>
                <Spacer />
                <Language form="bar" />
              </>
            }
          >
            {open === undefined ? (
              <Empty
                title="Rien à modifier"
                note="Revenez à la liste pour choisir un billet."
              />
            ) : (
              <Stack gap="xl">
                <Stack gap="sm">
                  <SwitchRow
                    on={!hidden}
                    label="Le billet paraît sur le site"
                    onChange={() =>
                      onDraft({
                        ...draft,
                        hidden: {
                          ...draft.hidden,
                          [editing.language]: !hidden,
                        },
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
          </Inspector>
        </div>
      </div>

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
          <Field label="Titre">
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
                setOpened(false)

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
