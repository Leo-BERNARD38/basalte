// L’island unique du panel (invariant 6). Elle tient l’état de la session, le
// brouillon de la page ouverte, et le choix d’une image — tout ce que
// plusieurs écrans partagent.
//
// Astro ne partage aucun contexte React entre islands séparées : un arbre
// unique supprime le problème, et `client:only` évite tout souci
// d’hydratation.
//
// Un brouillon n’est repris du serveur que sur trois évènements : l’ouverture
// du panel, un enregistrement réussi, et un changement de page consenti. Tout
// le reste — une image ajoutée, une description corrigée — recharge la charge
// utile sans y toucher.

import '@mantine/core/styles.css'
import './panel.css'

import {
  Button,
  Center,
  Group,
  Loader,
  MantineProvider,
  Modal,
  Stack,
  Text,
} from '@mantine/core'
import { useEffect, useState } from 'react'

import { asideOf, asidesOf, isAside } from './asides.js'
import { pageLabel } from '../content/naming.js'
import type { PublishState } from '../publish/publish.js'
import type { DraftPage } from '../server/pages.js'
import type { PanelPayload } from '../server/panel.js'
import { today } from '../fields/date.js'
import type { DraftPost } from '../server/posts.js'
import { Account } from './Account.js'
import {
  createPost,
  deletePost,
  loadPanel,
  publishSite,
  readPublication,
  savePage,
  savePost,
} from './api.js'
import { sameDraft, type Draft } from './draft.js'
import { Edit } from './Edit.js'
import { EditingContext, type Editing } from './editing.js'
import { Journal, type PostValues } from './Journal.js'
import { DocumentPicker } from './DocumentPicker.js'
import { MediaLibrary } from './MediaLibrary.js'
import { MediaPicker } from './MediaPicker.js'
import { Messages } from './Messages.js'
import { screensFor, SCREENS, Shell, type Screen } from './Shell.js'
import { SignIn } from './SignIn.js'
import { Stats } from './Stats.js'
import { cssVariables, theme } from './theme.js'

const EMPTY: Draft = { meta: {}, blocks: [] }
const NO_POST: PostValues = { hidden: {}, fields: {} }
const IDLE: PublishState = { running: false, queued: false }

// Un build dure des secondes, pas des millisecondes : le panel revient lire
// l’état plutôt que de tenir une requête ouverte pendant ce temps.
const POLL = 1500

/** Ce que le client s’apprête à ouvrir, quand un brouillon l’en empêche. */
type Asked =
  | { readonly kind: 'page'; readonly name: string }
  | { readonly kind: 'post'; readonly slug: string }

type Picker = {
  readonly current: string
  /** Les proportions que le champ demandeur attend, quand il en déclare. */
  readonly ratio?: string
  readonly resolve: (key: string | undefined) => void
}

export default function Panel({ site }: { readonly site: string }) {
  const [payload, setPayload] = useState<PanelPayload | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [screen, setScreen] = useState<Screen>(readScreen())
  const [selected, setSelected] = useState('')
  const [language, setLanguage] = useState('')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined)
  const [problems, setProblems] = useState<readonly string[]>([])
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<Picker | undefined>(undefined)
  const [documentPicker, setDocumentPicker] = useState<Picker | undefined>(
    undefined,
  )
  const [openedPost, setOpenedPost] = useState('')
  const [postDraft, setPostDraft] = useState<PostValues>(NO_POST)
  const [asked, setAsked] = useState<Asked | undefined>(undefined)
  const [publication, setPublication] = useState<PublishState>(IDLE)

  // Relit tout ce que le serveur sait du site, en laissant le brouillon où il
  // est.
  //
  // Seule une session refusée ramène à l’écran de connexion. Un serveur qui ne
  // répond pas laisse l’écran en place : il reviendra, et renvoyer le client
  // se connecter lui ferait croire qu’il a perdu ce qu’il vient d’écrire.
  const refresh = async (): Promise<PanelPayload | undefined> => {
    const answer = await loadPanel()

    setReady(true)

    if (!answer.ok) {
      if (answer.signedOut) setPayload(undefined)
      else setProblems([answer.message])

      return undefined
    }

    const data = answer.data

    setPayload(data)
    setProblems([])
    setPublication(data.publication)
    setLanguage(
      (current) =>
        current ||
        (data.site.languages.find((entry) => entry.default)?.code ?? ''),
    )

    return data
  }

  const openPost = (post: DraftPost) => {
    setOpenedPost(post.slug)
    setPostDraft({ hidden: post.hidden, fields: post.fields })
    setProblems([])
  }

  const open = (page: DraftPage) => {
    setSelected(page.name)
    setDraft({ meta: page.meta, blocks: page.blocks })
    setProblems([])
  }

  // Une entrée qui n’est pas une page s’ouvre comme une page, et le brouillon
  // garde sa forme : ses emplacements sont des sections, elle n’a simplement
  // pas de métadonnées.
  const openAside = (data: PanelPayload, entry: string) => {
    const aside =
      asidesOf(data).find((item) => item.entry === entry) ?? asidesOf(data)[0]

    if (aside === undefined) return

    setSelected(aside.entry)
    setDraft({ meta: {}, blocks: aside.sections })
    setProblems([])
  }

  /** Relit, puis ouvre une page : le brouillon vient alors du serveur. */
  const load = async (page?: string, slug?: string) => {
    const data = await refresh()

    if (data === undefined) return

    // Le billet ouvert se reprend du serveur au même titre que la page : c’est
    // ce qui fait que « enregistrer » repart de ce que le dépôt contient.
    const posts = data.journal?.posts ?? []
    const wantedPost = slug ?? openedPost
    const post =
      posts.find((entry) => entry.slug === wantedPost) ??
      (wantedPost === '' ? posts[0] : undefined)

    if (post !== undefined) openPost(post)
    else {
      setOpenedPost('')
      setPostDraft(NO_POST)
    }

    const wanted = page ?? selected

    if (isAside(wanted)) {
      openAside(data, wanted)
      return
    }

    const opened =
      data.pages.find((entry) => entry.name === wanted) ?? data.pages[0]

    if (opened !== undefined) open(opened)
    else openAside(data, wanted)
  }

  useEffect(() => {
    void load()

    const follow = () => setScreen(readScreen())

    window.addEventListener('hashchange', follow)

    return () => window.removeEventListener('hashchange', follow)
  }, [])

  const online = publication.running || publication.queued

  useEffect(() => {
    if (!online) return undefined

    const timer = setInterval(async () => {
      const answer = await readPublication()

      if (!answer.ok) return

      setPublication(answer.data.publication)

      // Une mise en ligne qui s’achève a pu buter sur un contenu que le panel
      // ne connaissait pas encore : relire dit au client ce qui cloche.
      if (!answer.data.publication.running && !answer.data.publication.queued) {
        await refresh()
      }
    }, POLL)

    return () => clearInterval(timer)
  }, [online])

  const page = payload?.pages.find((entry) => entry.name === selected)
  const aside = payload === undefined ? undefined : asideOf(payload, selected)
  const saved =
    aside !== undefined
      ? { meta: {}, blocks: aside.sections }
      : page === undefined
        ? undefined
        : { meta: page.meta, blocks: page.blocks }

  const post = payload?.journal?.posts.find(
    (entry) => entry.slug === openedPost,
  )

  // Le journal tient son brouillon à part : ouvrir un billet ne doit pas
  // effacer une page en cours, et l’inverse non plus.
  const postDirty =
    post !== undefined &&
    JSON.stringify(postDraft) !==
      JSON.stringify({ hidden: post.hidden, fields: post.fields })

  const editingJournal = screen === 'journal'
  const dirty = editingJournal
    ? postDirty
    : saved !== undefined && !sameDraft(draft, saved)

  // Fermer l’onglet sur des modifications non enregistrées passe par la
  // confirmation du navigateur : le panel n’a pas d’autre prise sur ce
  // départ-là.
  useEffect(() => {
    if (!dirty) return undefined

    const warn = (event: BeforeUnloadEvent) => event.preventDefault()

    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!ready) {
    return (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariables}>
        <Center h="100vh">
          <Loader />
        </Center>
      </MantineProvider>
    )
  }

  if (payload === undefined) {
    return (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariables}>
        <SignIn site={site} onSignedIn={() => void load()} />
      </MantineProvider>
    )
  }

  const known = payload

  // Une adresse ancienne peut nommer un écran que le site ne déclare plus :
  // elle ramène à l’édition plutôt qu’à un écran vide.
  const available = screensFor(
    known.site.capabilities,
    known.journal !== undefined,
  )
  const shown = available.some((entry) => entry.value === screen)
    ? screen
    : 'edit'

  const save = async (): Promise<boolean> => {
    setBusy(true)

    const answer = editingJournal
      ? await savePost(openedPost, postDraft)
      : aside === undefined
        ? await savePage(selected, draft)
        : await aside.save(draft)

    setBusy(false)

    if (!answer.ok) {
      setProblems(
        answer.problems.length > 0 ? answer.problems : [answer.message],
      )

      if (answer.signedOut) setPayload(undefined)

      return false
    }

    setProblems([])
    setSavedAt(Date.now())
    await load(selected, editingJournal ? openedPost : undefined)

    return true
  }

  // Écrire un billet, puis l’ouvrir : le client enchaîne sur son texte sans un
  // clic de plus, ce qui est tout ce qu’on lui demande de faire chaque jour.
  const compose = async (title: string) => {
    setBusy(true)

    const answer = await createPost(title, today())

    setBusy(false)

    if (!answer.ok) {
      setProblems(
        answer.problems.length > 0 ? answer.problems : [answer.message],
      )

      if (answer.signedOut) setPayload(undefined)

      return
    }

    setSavedAt(Date.now())
    await load(selected, answer.data.post.slug)
  }

  const remove = async (slug: string) => {
    setBusy(true)

    const answer = await deletePost(slug)

    setBusy(false)

    if (!answer.ok) {
      setProblems([answer.message])

      if (answer.signedOut) setPayload(undefined)

      return
    }

    setOpenedPost('')
    setPostDraft(NO_POST)
    setSavedAt(Date.now())
    await load(selected, '')
  }

  // Ce qui part en ligne est ce qui est enregistré : un chantier laissé dans le
  // navigateur sortirait sinon sans son dernier paragraphe.
  const goOnline = async () => {
    if (dirty && !(await save())) return

    const answer = await publishSite()

    if (answer.ok) setPublication(answer.data.publication)
    else setProblems([answer.message])
  }

  const select = (name: string) => {
    if (name === selected) return

    ask({ kind: 'page', name })
  }

  const selectPost = (slug: string) => {
    if (slug === openedPost) return

    ask({ kind: 'post', slug })
  }

  // Le même garde-fou pour une page et pour un billet : rien ne fait perdre un
  // brouillon sans le dire.
  function ask(next: Asked): void {
    if (dirty) setAsked(next)
    else reveal(next)
  }

  const abandon = () => {
    const next = asked

    setAsked(undefined)

    if (next !== undefined) reveal(next)
  }

  function reveal(next: Asked): void {
    if (next.kind === 'post') {
      const post = known.journal?.posts.find(
        (entry) => entry.slug === next.slug,
      )

      if (post !== undefined) openPost(post)

      return
    }

    if (isAside(next.name)) {
      openAside(known, next.name)
      return
    }

    const opened = known.pages.find((entry) => entry.name === next.name)

    if (opened !== undefined) open(opened)
  }

  const editing: Editing = {
    language,
    languages: known.site.languages,
    capabilities: known.site.capabilities,
    media: known.media,
    documents: known.documents,
    pickImage: (current, ratio) =>
      new Promise((resolve) =>
        setPicker({
          current,
          resolve,
          ...(ratio === undefined ? {} : { ratio }),
        }),
      ),
    pickDocument: (current) =>
      new Promise((resolve) => setDocumentPicker({ current, resolve })),
  }

  const answerPicker = (key: string | undefined) => {
    picker?.resolve(key)
    setPicker(undefined)
  }

  const answerDocumentPicker = (key: string | undefined) => {
    documentPicker?.resolve(key)
    setDocumentPicker(undefined)
  }

  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariables}>
      <EditingContext.Provider value={editing}>
        <Shell
          payload={known}
          screen={shown}
          heading={heading(
            shown,
            shown === 'journal'
              ? post?.title
              : (aside?.title ??
                  (page === undefined ? undefined : pageLabel(page.name))),
          )}
          onScreen={goTo}
          language={language}
          onLanguage={setLanguage}
          dirty={dirty}
          busy={busy}
          savedAt={savedAt}
          problems={problems}
          publication={publication}
          onSave={() => void save()}
          onPublish={() => void goOnline()}
          onSignedOut={() => setPayload(undefined)}
        >
          {shown === 'edit' && (
            <Edit
              payload={known}
              selected={selected}
              draft={draft}
              savedAt={savedAt}
              dirty={dirty}
              onSelect={select}
              onDraft={setDraft}
            />
          )}

          {shown === 'journal' && (
            <Journal
              payload={known}
              selected={openedPost}
              draft={postDraft}
              savedAt={savedAt}
              dirty={dirty}
              busy={busy}
              onSelect={selectPost}
              onDraft={setPostDraft}
              onCreate={(title) => void compose(title)}
              onDelete={(slug) => void remove(slug)}
            />
          )}

          {shown === 'media' && (
            <MediaLibrary
              media={known.media}
              documents={known.documents}
              onChanged={() => void refresh()}
            />
          )}

          {shown === 'messages' && (
            <Messages
              retention={known.retention}
              notified={known.notified}
              onChanged={() => void refresh()}
              onSignedOut={() => setPayload(undefined)}
            />
          )}

          {shown === 'stats' && (
            <Stats onSignedOut={() => setPayload(undefined)} />
          )}

          {shown === 'account' && (
            <Account
              support={known.support}
              onSignedOut={() => setPayload(undefined)}
            />
          )}
        </Shell>

        <MediaPicker
          opened={picker !== undefined}
          media={known.media}
          current={picker?.current ?? ''}
          ratio={picker?.ratio}
          onChanged={() => void refresh()}
          onClose={() => answerPicker(undefined)}
          onChoose={answerPicker}
        />

        <DocumentPicker
          opened={documentPicker !== undefined}
          documents={known.documents}
          current={documentPicker?.current ?? ''}
          onChanged={() => void refresh()}
          onClose={() => answerDocumentPicker(undefined)}
          onChoose={answerDocumentPicker}
        />

        <Modal
          opened={asked !== undefined}
          onClose={() => setAsked(undefined)}
          title="Modifications non enregistrées"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              {asked?.kind === 'post'
                ? 'Ce billet porte des modifications qui ne sont pas enregistrées. En ouvrir un autre maintenant les perd.'
                : 'Cette page porte des modifications qui ne sont pas enregistrées. Ouvrir une autre page maintenant les perd.'}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setAsked(undefined)}>
                Rester ici
              </Button>
              <Button color="red" onClick={abandon}>
                Abandonner les modifications
              </Button>
            </Group>
          </Stack>
        </Modal>
      </EditingContext.Provider>
    </MantineProvider>
  )
}

/**
 * Le titre de l’en-tête : ce qui est ouvert quand un écran ouvre quelque chose,
 * le nom de l’écran ailleurs.
 */
function heading(screen: Screen, opened: string | undefined): string {
  const label =
    SCREENS.find((entry) => entry.value === screen)?.label ?? 'Édition'

  return screen === 'edit' || screen === 'journal' ? (opened ?? label) : label
}

function readScreen(): Screen {
  const asked = window.location.hash.replace('#', '')

  return SCREENS.some((entry) => entry.value === asked)
    ? (asked as Screen)
    : 'edit'
}

function goTo(screen: Screen): void {
  window.location.hash = screen
}
