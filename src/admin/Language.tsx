// Le choix de la langue écrite, sous celui de la page, en tête de la colonne
// qui dit ce qu’on modifie.
//
// Il a vécu sur la barre noire, entre l’adresse du compte et « Se
// déconnecter », où il se lisait comme un réglage de session ; puis dans la
// barre de l’aperçu, où il disait ce que l’aperçu montre. Il décide en réalité
// de ce qu’on est en train d’écrire : sa place est à côté de la page, dans la
// colonne de structure, et l’aperçu suit.
//
// C’est le même objet que le sélecteur de page : deux boutons voisins qui
// décident de la même chose ne peuvent pas ouvrir l’un le plan du panel,
// l’autre une liste du navigateur. Le menu, ses lignes et l’aplat qui désigne
// la ligne choisie sont donc ceux de partout ailleurs.
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
import { Anchor, Menu, Selector } from './ui/Overlay.js'
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

/**
 * `form` : « bar » quand le choix se tient dans une tête d’écran, où une
 * hauteur de champ n’a pas sa place.
 */
export function Language({ form }: { readonly form?: 'bar' | undefined }) {
  const editing = useEditing()
  const [opened, setOpened] = useState(false)

  if (editing.languages.length < 2) return null

  const chosen = editing.languages.find(
    (entry) => entry.code === editing.language,
  )

  return (
    <Anchor fill={form === undefined}>
      <Selector
        label="Langue"
        form={form}
        value={chosen?.label ?? editing.language}
        mark={draftMark(chosen)}
        opened={opened}
        onToggle={() => setOpened(!opened)}
      />

      <Menu
        opened={opened}
        align="left"
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
  )
}
