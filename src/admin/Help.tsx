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
import { Eyebrow, Text } from './ui/Text.js'

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
 * Ce que le panel ajoute, et ce qu’il n’ajoute pas. Le client pose une section
 * quand il le veut (D179) ; une page, ou une sorte de section qui n’existe pas
 * encore, reste un travail de développement, et c’est là que l’adresse sert.
 */
function addingNote(support: string): Note {
  return {
    heading: 'Ajouter une section ou une page',
    body: (
      <>
        « Ajouter une section » est sous la liste des sections. Une page de
        plus, ou une sorte de section qui n’est pas dans la liste,{' '}
        {writeTo(support)}
      </>
    ),
  }
}

/**
 * Mettre un texte en forme : la même note sur les deux écrans qui portent un
 * texte long — les sections d’une page, et le corps d’un billet.
 */
const FORMATTING: Note = {
  heading: 'Mettre un texte en forme',
  body: 'Dans un texte long : ## pour un titre, - pour une liste, **gras**, *italique*, et [libellé](https://…) pour un lien. Le reste s’affiche tel quel, et l’aperçu sous le champ montre le résultat.',
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
        body: 'Vous ajoutez, modifiez, réordonnez, masquez et supprimez les sections. Une section masquée reste dans la liste : c’est le seul endroit d’où la rallumer.',
      },
      addingNote(support),
      {
        heading: 'L’aperçu',
        body: 'Cliquez une section dedans pour la modifier : ce que vous voyez est ce que vous réglez. Il montre le dernier enregistrement, c’est-à-dire ce qui partira en ligne — enregistrez pour le voir se mettre à jour.',
      },
      {
        heading: 'L’onglet « Page »',
        body: 'Son titre et sa description ne s’affichent pas sur la page : ce sont eux que les moteurs de recherche montrent dans leurs résultats, et que les réseaux reprennent quand le lien est partagé. L’image de partage aussi.',
      },
      {
        heading: 'Un champ laissé vide',
        body: 'Beaucoup se remplissent tout seuls. Sans logo, le nom du site s’affiche en toutes lettres ; sans liens dans l’en-tête, le menu reprend les pages du site ; sans libellé, un bouton de téléchargement dit « Télécharger » et le mot du menu sur téléphone dit « Menu ». Une liste d’actualités sans limite les porte toutes, groupées par année. Les horaires s’écrivent en 09:00, une ligne par jour ouvré.',
      },
      {
        heading: 'La mention de consentement',
        body: 'Le formulaire de contact en demande une : elle dit à quoi servent les coordonnées, et mène à votre politique de confidentialité. Obligatoire en pratique, même si rien ne vous en empêche.',
      },
      {
        heading: 'Ce qui ne se voit que sur ordinateur',
        body: 'Le côté d’une mise en avant et la largeur double d’une carte ne valent que là : sur téléphone, l’image suit toujours le texte, et chaque carte prend la ligne. Un prix et un chiffre clé, eux, s’affichent tels que vous les écrivez — avec leur devise, leur unité et leur signe.',
      },
      FORMATTING,
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
      {
        heading: 'La date',
        body: 'C’est elle qui ordonne le journal, et non le jour où vous avez écrit. La changer déplace le billet dans la liste et sur le site.',
      },
      FORMATTING,
    ],
    media: [
      {
        heading: 'Ce que cet onglet range',
        body: 'Vous y écrivez le texte alternatif d’une image, vous y désignez son sujet, vous voyez où elle sert, et vous la supprimez. Pour poser une image sur une page, passez par l’onglet « Édition » : la bibliothèque s’y ouvre par-dessus la page que vous remplissez.',
      },
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
            <Eyebrow>ce que cet écran permet</Eyebrow>

            {notes.map((note) => (
              <Stack key={note.heading} gap="xs">
                <strong>{note.heading}</strong>
                <Text tone="muted">{note.body}</Text>
              </Stack>
            ))}
          </Stack>
        </Menu>
      </Anchor>
    </span>
  )
}
