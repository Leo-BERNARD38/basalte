// Le choix de la page, dans la barre de l’aperçu.
//
// C’est l’adresse d’une chrome de navigateur : ce qu’on regarde se lit au-dessus
// de ce qu’on regarde. Ce choix vivait dans une colonne de gauche, avec la
// langue et les sections ; les sections se désignent maintenant dans l’aperçu,
// et la colonne n’avait plus de raison d’être. L’objection d’alors — « une puce
// d’adresse ne se lisait pas comme le menu des pages » — visait une puce muette,
// qui ne portait que la route ; celle-ci porte le titre de la page et le chevron
// d’un menu.
//
// Les deux dernières entrées ne sont pas des pages : l’en-tête avec le pied, et
// la fiche de l’entreprise. Un filet les sépare du reste.

import type { PanelPayload } from '../server/panel.js'
import { asidesOf } from './asides.js'
import { orderedPages, pageTitle } from './pages.js'
import { Anchor, Menu, Selector } from './ui/Overlay.js'
import { Row, RowStack, RowText } from './ui/Row.js'
import { Eyebrow, Mono, plural } from './ui/Text.js'

export function PageMenu({
  payload,
  selected,
  title,
  opened,
  onOpened,
  onSelect,
}: {
  readonly payload: PanelPayload
  readonly selected: string
  /** Ce qui est ouvert : le titre de la page, ou celui d’une entrée fixe. */
  readonly title: string
  readonly opened: boolean
  readonly onOpened: (opened: boolean) => void
  readonly onSelect: (name: string) => void
}) {
  const site = payload.site.name

  const choose = (name: string) => {
    onSelect(name)
    onOpened(false)
  }

  return (
    <Anchor>
      <Selector
        label="Page"
        form="bar"
        value={title}
        opened={opened}
        onToggle={() => onOpened(!opened)}
      />

      <Menu
        opened={opened}
        align="left"
        label="Vos pages"
        onClose={() => onOpened(false)}
      >
        <Eyebrow className="basalte-menu__note">
          vos pages · cliquez pour la modifier
        </Eyebrow>

        {orderedPages(payload.pages).map((entry) => (
          <Row
            key={entry.name}
            pill
            current={entry.name === selected}
            onClick={() => choose(entry.name)}
          >
            <RowStack>
              <span>{pageTitle(entry, site)}</span>
              <Mono className="basalte-row__note">{entry.route}</Mono>
            </RowStack>
            <Mono className="basalte-row__note">
              {entry.blocks.length} {plural(entry.blocks.length, 'section')}
            </Mono>
          </Row>
        ))}

        <span className="basalte-menu__rule" />

        {asidesOf(payload).map((entry) => (
          <Row
            key={entry.entry}
            pill
            current={entry.entry === selected}
            onClick={() => choose(entry.entry)}
          >
            <RowText>{entry.title}</RowText>
          </Row>
        ))}
      </Menu>
    </Anchor>
  )
}
