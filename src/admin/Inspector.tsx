// Le volet de droite : ce qu’on modifie, une chose à la fois.
//
// Au-dessus de 1 200 pixels il est une colonne à côté de l’aperçu ; en dessous,
// il vient par-dessus lui — mais jamais par-dessus la barre d’application, où
// « Enregistrer » et « Mettre en ligne » vivent à la même place sur tous les
// écrans (D214). C’est la feuille qui décide de sa forme, jamais une lecture de
// la largeur : le volet ne se démonte pas, il n’a donc qu’un seul arbre, et
// c’est déjà ainsi que la navigation vit ses deux formes.
//
// En couche il se comporte comme une couche : ce qu’il couvre devient inerte,
// le curseur entre dans sa tête, et l’échappement le referme. Ancré, aucune de
// ces trois choses n’a de sens — rien n’est couvert —, et c’est la feuille qui
// dit laquelle des deux formes il porte, lue une seule fois sur son cadre.
//
// Sa tête reste en place pendant qu’on parcourt son corps : ce qui défile est
// le contenu de la carte, pas la carte.

import { useEffect, useRef, type ReactNode } from 'react'

import { IconButton } from './ui/Button.js'
import { Close } from './ui/icons.js'
import { Spacer } from './ui/Layout.js'
import { overlaid } from './ui/Overlay.js'
import { Card, CardBody, CardHead } from './ui/Surface.js'

export function Inspector({
  opened,
  head,
  onClose,
  children,
}: {
  /** En couche, le volet ne se montre que s’il est ouvert. Ancré, toujours. */
  readonly opened: boolean
  readonly head: ReactNode
  /** Revenir : la liste depuis un formulaire, l’aperçu depuis la liste. */
  readonly onClose: () => void
  readonly children: ReactNode
}) {
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mine = frame.current

    if (!opened || mine === null) return

    // La feuille dit la forme : posé en couche, le volet est détaché du flux.
    // C’est la seule lecture de la largeur, et elle passe par le style calculé
    // plutôt que par une requête média écrite deux fois.
    if (getComputedStyle(mine).position !== 'absolute') return

    const covered = mine.parentElement?.querySelector('.basalte-stage')
    const opener = document.activeElement

    covered?.setAttribute('inert', '')
    mine.focus()

    function heard(event: KeyboardEvent): void {
      // Une fenêtre ouverte garde l’échappement pour elle, et un menu aussi :
      // les écouteurs sont sur le même document.
      if (event.key !== 'Escape' || overlaid()) return

      onClose()
    }

    document.addEventListener('keydown', heard)

    return () => {
      document.removeEventListener('keydown', heard)
      covered?.removeAttribute('inert')

      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [opened, onClose])

  return (
    <Card
      ref={frame}
      fill
      className="basalte-inspector"
      data-open={String(opened)}
      tabIndex={-1}
    >
      <CardHead>
        {head}
        <Spacer />
        {/* Le retour ne se voit qu’en couche : ancré, le volet n’a nulle part
            où se fermer, et il n’y a rien derrière lui à découvrir. */}
        <span className="basalte-inspector__close">
          <IconButton label="Revenir à l’aperçu" onClick={onClose}>
            <Close />
          </IconButton>
        </span>
      </CardHead>
      <CardBody>{children}</CardBody>
    </Card>
  )
}
