// Les phrases que le client peut demander, et qui ne s’affichent plus d’elles-
// mêmes.
//
// Elles étaient posées dans les écrans, en permanence (D134) : huit paragraphes
// gris qui expliquaient des boutons, tous les jours, à quelqu’un qui les connaît
// depuis le deuxième. La réponse reste où la question se pose — c’est ce que
// D134 tenait — mais elle attend qu’on la demande (D169).
//
// Pas d’écran d’aide : ce serait la septième page que D63 refuse, et il faudrait
// l’ouvrir en sachant déjà qu’elle existe. Un « ? » dans l’en-tête n’occupe rien
// et se trouve là où l’on est.
//
// Tout ce que le panel explique vit ici, et nulle part ailleurs : deux endroits
// auraient divergé à la première correction.

import { useState, type ReactNode } from 'react'

import type { PanelPayload } from '../server/panel.js'
import type { Screen } from './Shell.js'
import { IconButton } from './ui/Button.js'
import { Question } from './ui/icons.js'
import { Stack } from './ui/Layout.js'
import { Anchor, Menu } from './ui/Overlay.js'
import { Text } from './ui/Text.js'

type Note = {
  readonly heading: string
  readonly body: ReactNode
}

/** L’adresse du mainteneur, quand le site en déclare une. */
function writeTo(support: string): ReactNode {
  return support === '' ? (
    'ne se fait pas depuis le panel.'
  ) : (
    <>
      se demande à{' '}
      <a className="basalte-link" href={`mailto:${support}`}>
        {support}
      </a>
      .
    </>
  )
}

/**
 * Ce que cet écran-là explique. La première note est sur tous : les deux
 * boutons sont sur tous, et c’est la question que le client pose le plus
 * souvent.
 */
export function notesFor(
  screen: Screen,
  payload: PanelPayload,
): readonly Note[] {
  const support = payload.support

  const shared: Note = {
    heading: 'Enregistrer, puis mettre en ligne',
    body: 'Enregistrer garde votre travail. Mettre en ligne le montre aux visiteurs. Tant que vous n’avez pas mis en ligne, vous êtes seul à voir ce que vous venez d’écrire.',
  }

  const own: Readonly<Record<Screen, readonly Note[]>> = {
    edit: [
      {
        heading: 'Les sections d’une page',
        body: 'Vous modifiez, réordonnez et masquez les sections. Une section masquée reste dans la liste : c’est le seul endroit d’où la rallumer.',
      },
      {
        heading: 'Ajouter une section ou une page',
        body: <>Cela {writeTo(support)}</>,
      },
      {
        heading: 'L’aperçu',
        body: 'Il montre le dernier enregistrement, c’est-à-dire ce qui partira en ligne. Enregistrez pour le voir se mettre à jour.',
      },
    ],
    journal: [
      {
        heading: 'Écrire en plusieurs fois',
        body: 'Un billet masqué reste ici et ne part pas en ligne. C’est ce qui permet de l’écrire en plusieurs fois, et de le relire dans l’aperçu avant qu’il paraisse.',
      },
      {
        heading: 'L’adresse d’un billet',
        body: 'C’est son titre qui la fait, au moment où vous l’écrivez. Elle ne change plus ensuite, même si le titre change.',
      },
    ],
    media: [
      {
        heading: 'La description d’une image',
        body: 'C’est ce que lisent les personnes qui ne la voient pas, et ce que comprend Google. Elle est demandée dans chaque langue en ligne.',
      },
      {
        heading: 'Le point de l’image',
        body: 'Le cadrage le garde toujours visible, quelle que soit la forme que la page demande. Placez-le sur un visage, ou sur ce que la photo montre.',
      },
      {
        heading: 'Un document',
        body: 'Il se télécharge, il ne s’affiche jamais dans une page.',
      },
      {
        heading: 'Supprimer',
        body: 'Une image ou un document employé par une section ne se supprime pas : retirez-le d’abord de la section, puis revenez ici.',
      },
    ],
    messages: [
      {
        heading: 'Combien de temps ils restent',
        body: `Conservés ${payload.retention} mois, puis effacés. Rien ne les garde ailleurs.`,
      },
      {
        heading: 'Répondre',
        body: 'Le lien « Répondre à » ouvre votre logiciel de messagerie habituel : la réponse part de votre adresse, pas du site.',
      },
    ],
    stats: [
      {
        heading: 'Ce que ce rapport vaut',
        body: 'C’est un ordre de grandeur. Il ne pose aucun cookie et ne suit personne : deux personnes derrière la même connexion comptent pour une, et les robots sont écartés sur leur signature, qui n’est jamais complète.',
      },
    ],
    account: [
      {
        heading: 'Changer le mot de passe',
        body: 'Le changer ferme les sessions ouvertes ailleurs. Vous resterez connecté ici.',
      },
      {
        heading: 'Les appareils reconnus',
        body: 'Sur un appareil retenu, le code reçu par email n’est plus demandé pendant trente jours. « Oublier tous les appareils » le redemande partout, et vous déconnecte.',
      },
      {
        heading: 'Quelque chose ne va pas',
        body:
          support === '' ? (
            'Prévenez la personne qui a construit ce site.'
          ) : (
            <>
              Une page cassée, une section à ajouter, une question : écrivez à{' '}
              <a className="basalte-link" href={`mailto:${support}`}>
                {support}
              </a>
              .
            </>
          ),
      },
    ],
  }

  return [shared, ...own[screen]]
}

export function Help({
  screen,
  payload,
}: {
  readonly screen: Screen
  readonly payload: PanelPayload
}) {
  const [opened, setOpened] = useState(false)
  const notes = notesFor(screen, payload)

  return (
    <span className="basalte-help">
      <Anchor>
        <IconButton
          label="Aide"
          aria-expanded={opened}
          onClick={() => setOpened(!opened)}
        >
          <Question />
        </IconButton>

        <Menu
          opened={opened}
          onClose={() => setOpened(false)}
          label="Ce que cet écran permet"
        >
          <Stack gap="xl">
            {notes.map((note) => (
              <Stack key={note.heading} gap="xs">
                <strong>{note.heading}</strong>
                <Text tone="muted" size="small">
                  {note.body}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Menu>
      </Anchor>
    </span>
  )
}
