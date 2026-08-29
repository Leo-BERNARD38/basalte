// L’island unique du panel (invariant 6). Elle tient l’état de la session, le
// brouillon de la page ouverte, et le choix d’une image — tout ce que
// plusieurs écrans partagent.
//
// Astro ne partage aucun contexte React entre islands séparées : un arbre
// unique supprime le problème, et `client:only` évite tout souci
// d’hydratation.

import '@mantine/core/styles.css'
import './panel.css'

import { Center, Loader, MantineProvider } from '@mantine/core'
import { useEffect, useState } from 'react'

import { slugFor } from '../astro/routes.js'
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

  const load = async (page?: string) => {
    const answer = await loadPanel()

    setReady(true)

    if (!answer.ok) {
      setPayload(undefined)
      return
    }

    const data = answer.data
    const name = page ?? selected

    const opened =
      data.pages.find((entry) => entry.name === name) ?? data.pages[0]

    setPayload(data)
    setLanguage(
      (current) =>
        current ||
        (data.site.languages.find((entry) => entry.default)?.code ?? ''),
    )

    if (opened !== undefined) {
      setSelected(opened.name)
      setDraft({ meta: opened.meta, blocks: opened.blocks })
    }
  }

  useEffect(() => {
    void load()

    const follow = () => setScreen(readScreen())

    window.addEventListener('hashchange', follow)

    return () => window.removeEventListener('hashchange', follow)
  }, [])

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

  const page = payload.pages.find((entry) => entry.name === selected)
  const dirty =
    page !== undefined &&
    !sameDraft(draft, { meta: page.meta, blocks: page.blocks })

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

  const preview = async () => {
    if (dirty && !(await save())) return

    const prefix =
      language ===
      (payload.site.languages.find((entry) => entry.default)?.code ?? '')
        ? ''
        : language

    const slug = slugFor(page?.route ?? '/', prefix) ?? ''

    window.open(`${PREVIEW}${slug}`, '_blank', 'noopener')
  }

  const editing: Editing = {
    language,
    languages: payload.site.languages,
    media: payload.media,
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
          payload={payload}
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
              payload={payload}
              selected={selected}
              draft={draft}
              onSelect={(name) => {
                const opened = payload.pages.find(
                  (entry) => entry.name === name,
                )

                if (opened === undefined) return

                setSelected(name)
                setDraft({ meta: opened.meta, blocks: opened.blocks })
                setProblems([])
              }}
              onDraft={setDraft}
            />
          )}

          {screen === 'media' && (
            <MediaLibrary
              media={payload.media}
              onChanged={() => void load(selected)}
            />
          )}

          {screen === 'account' && (
            <Account onSignedOut={() => setPayload(undefined)} />
          )}
        </Shell>

        <MediaPicker
          opened={picker !== undefined}
          media={payload.media}
          current={picker?.current ?? ''}
          onChanged={() => void load(selected)}
          onClose={() => answerPicker(undefined)}
          onChoose={answerPicker}
        />
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
