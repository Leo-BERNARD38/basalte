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

import { slugFor } from '../astro/routes.js'
import type { DraftPage } from '../server/pages.js'
import type { PanelPayload } from '../server/panel.js'
import { Account } from './Account.js'
import { loadPanel, savePage } from './api.js'
import { sameDraft, type Draft } from './draft.js'
import { Edit } from './Edit.js'
import { EditingContext, type Editing } from './editing.js'
import { MediaLibrary } from './MediaLibrary.js'
import { MediaPicker } from './MediaPicker.js'
import { SCREENS, Shell, type Screen } from './Shell.js'
import { SignIn } from './SignIn.js'

const PREVIEW = '/admin/preview/'
const EMPTY: Draft = { meta: {}, blocks: [] }

type Picker = {
  readonly current: string
  readonly resolve: (key: string | undefined) => void
}

export default function Panel() {
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
  const [asked, setAsked] = useState<string | undefined>(undefined)

  // Relit tout ce que le serveur sait du site, en laissant le brouillon où il
  // est.
  const refresh = async (): Promise<PanelPayload | undefined> => {
    const answer = await loadPanel()

    setReady(true)

    if (!answer.ok) {
      setPayload(undefined)
      return undefined
    }

    const data = answer.data

    setPayload(data)
    setLanguage(
      (current) =>
        current ||
        (data.site.languages.find((entry) => entry.default)?.code ?? ''),
    )

    return data
  }

  const open = (page: DraftPage) => {
    setSelected(page.name)
    setDraft({ meta: page.meta, blocks: page.blocks })
    setProblems([])
  }

  /** Relit, puis ouvre une page : le brouillon vient alors du serveur. */
  const load = async (page?: string) => {
    const data = await refresh()

    if (data === undefined) return

    const opened =
      data.pages.find((entry) => entry.name === (page ?? selected)) ??
      data.pages[0]

    if (opened !== undefined) open(opened)
  }

  useEffect(() => {
    void load()

    const follow = () => setScreen(readScreen())

    window.addEventListener('hashchange', follow)

    return () => window.removeEventListener('hashchange', follow)
  }, [])

  const page = payload?.pages.find((entry) => entry.name === selected)
  const dirty =
    page !== undefined &&
    !sameDraft(draft, { meta: page.meta, blocks: page.blocks })

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
      <MantineProvider>
        <Center h="100vh">
          <Loader />
        </Center>
      </MantineProvider>
    )
  }

  if (payload === undefined) {
    return (
      <MantineProvider>
        <SignIn site="Panel" onSignedIn={() => void load()} />
      </MantineProvider>
    )
  }

  const known = payload

  const save = async (): Promise<boolean> => {
    setBusy(true)

    const answer = await savePage(selected, draft)

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
    await load(selected)

    return true
  }

  // La fenêtre s’ouvre avant l’enregistrement : ouverte après une attente, le
  // navigateur la prendrait pour une fenêtre surgissante et la bloquerait.
  const preview = async () => {
    const tab = window.open('', '_blank')

    if (tab !== null) tab.opener = null

    if (dirty && !(await save())) {
      tab?.close()
      return
    }

    const prefix =
      language ===
      (known.site.languages.find((entry) => entry.default)?.code ?? '')
        ? ''
        : language

    const address = `${PREVIEW}${slugFor(page?.route ?? '/', prefix) ?? ''}`

    if (tab === null) window.open(address, '_blank', 'noopener')
    else tab.location.replace(address)
  }

  const select = (name: string) => {
    if (name === selected) return

    if (dirty) {
      setAsked(name)
      return
    }

    const opened = known.pages.find((entry) => entry.name === name)

    if (opened !== undefined) open(opened)
  }

  const abandon = () => {
    const opened = known.pages.find((entry) => entry.name === asked)

    setAsked(undefined)

    if (opened !== undefined) open(opened)
  }

  const editing: Editing = {
    language,
    languages: known.site.languages,
    media: known.media,
    pickImage: (current) =>
      new Promise((resolve) => setPicker({ current, resolve })),
  }

  const answerPicker = (key: string | undefined) => {
    picker?.resolve(key)
    setPicker(undefined)
  }

  return (
    <MantineProvider>
      <EditingContext.Provider value={editing}>
        <Shell
          payload={known}
          screen={screen}
          onScreen={goTo}
          language={language}
          onLanguage={setLanguage}
          dirty={dirty}
          busy={busy}
          savedAt={savedAt}
          problems={problems}
          onSave={() => void save()}
          onPreview={() => void preview()}
          onSignedOut={() => setPayload(undefined)}
        >
          {screen === 'edit' && (
            <Edit
              payload={known}
              selected={selected}
              draft={draft}
              onSelect={select}
              onDraft={setDraft}
            />
          )}

          {screen === 'media' && (
            <MediaLibrary
              media={known.media}
              onChanged={() => void refresh()}
            />
          )}

          {screen === 'account' && (
            <Account onSignedOut={() => setPayload(undefined)} />
          )}
        </Shell>

        <MediaPicker
          opened={picker !== undefined}
          media={known.media}
          current={picker?.current ?? ''}
          onChanged={() => void refresh()}
          onClose={() => answerPicker(undefined)}
          onChoose={answerPicker}
        />

        <Modal
          opened={asked !== undefined}
          onClose={() => setAsked(undefined)}
          title="Modifications non enregistrées"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Cette page porte des modifications qui ne sont pas enregistrées.
              Ouvrir une autre page maintenant les perd.
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

function readScreen(): Screen {
  const asked = window.location.hash.replace('#', '')

  return SCREENS.some((entry) => entry.value === asked)
    ? (asked as Screen)
    : 'edit'
}

function goTo(screen: Screen): void {
  window.location.hash = screen
}
