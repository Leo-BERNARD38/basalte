// Le choix de la langue écrite, posé dans la barre de l’aperçu, à côté du
// choix de la page.
//
// Il vivait sur la barre noire, entre l’adresse du compte et « Se déconnecter »
// : à cet endroit il se lisait comme un réglage de session, quand il décide en
// réalité de ce qu’on est en train d’écrire. « Quelle page, dans quelle langue,
// sur quel support » est une seule question, et elle se pose au-dessus de
// l’aperçu qui y répond.
//
// C’est le même objet que le sélecteur de page, et pas une liste du système :
// deux boutons voisins qui décident de la même chose ne peuvent pas ouvrir
// l’un le plan du panel, l’autre une fenêtre du navigateur. Le menu, ses
// lignes et l’aplat qui désigne la ligne choisie sont donc ceux de partout
// ailleurs.
//
// Une langue en préparation porte les hachures, comme un brouillon et une
// section masquée : ce sont les trois mêmes choses — ce qui n’est pas encore
// sur le site. Elle les porte jusque sur le bouton fermé, parce qu’écrire
// longuement dans une langue que personne ne verra est l’erreur que ce
// sélecteur doit empêcher.
//
// Il ne paraît que là où un brouillon se tient par langue — l’édition et les
// actualités. Ailleurs, chaque langue est demandée en même temps que les
// autres dans le même formulaire, et le choix ne changerait rien à l’écran.

import { useState } from 'react'

import type { PanelLanguage } from '../server/panel.js'
import { useEditing } from './editing.js'
import { Mark } from './ui/Badge.js'
import { HiddenMark } from './ui/icons.js'
import { Anchor, Menu } from './ui/Overlay.js'
import { Row, RowText } from './ui/Row.js'
import { Eyebrow } from './ui/Text.js'

/** Les hachures d’une langue que le site ne sert pas encore. */
function draftMark(language: PanelLanguage | undefined) {
  if (language?.draft !== true) return undefined

  return (
    <Mark hatched>
      <HiddenMark size={12} />
      en préparation
    </Mark>
  )
}

export function Language() {
  const editing = useEditing()
  const [opened, setOpened] = useState(false)

  if (editing.languages.length < 2) return null

  const chosen = editing.languages.find(
    (entry) => entry.code === editing.language,
  )

  return (
    <span className="basalte-language">
      <Anchor>
        <button
          type="button"
          className="basalte-picker"
          aria-expanded={opened}
          onClick={() => setOpened(!opened)}
        >
          {chosen?.label ?? editing.language}
          {draftMark(chosen)}
        </button>

        <Menu
          opened={opened}
          label="Vos langues"
          onClose={() => setOpened(false)}
        >
          <Eyebrow className="basalte-menu__note">
            la langue que vous écrivez
          </Eyebrow>

          {editing.languages.map((entry) => (
            <Row
              key={entry.code}
              pill
              current={entry.code === editing.language}
              onClick={() => {
                editing.onLanguage(entry.code)
                setOpened(false)
              }}
            >
              <RowText>{entry.label}</RowText>
              {draftMark(entry)}
            </Row>
          ))}
        </Menu>
      </Anchor>
    </span>
  )
}
