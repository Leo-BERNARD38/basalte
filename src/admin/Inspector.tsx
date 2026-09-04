// Le volet de droite : ce qu’on modifie, une chose à la fois.
//
// Au-dessus de 1 200 pixels il est une colonne à côté de l’aperçu ; en dessous,
// il vient par-dessus lui — mais jamais par-dessus la barre d’application, où
// « Enregistrer » et « Mettre en ligne » vivent à la même place sur tous les
// écrans (D214). C’est la feuille qui décide de sa forme, jamais une lecture de
// la largeur : le volet ne se démonte pas, il n’a donc qu’un seul arbre, et
// c’est déjà ainsi que la navigation vit ses deux formes.
//
// Sa tête reste en place pendant qu’on parcourt son corps : ce qui défile est
// le contenu de la carte, pas la carte.

import { useEffect, type ReactNode } from 'react'

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
  useEffect(() => {
    if (!opened) return

    function heard(event: KeyboardEvent): void {
      // Une fenêtre ouverte garde l’échappement pour elle : les deux écouteurs
      // sont sur le même document, et elle ne peut pas l’y retenir seule.
      if (event.key !== 'Escape' || overlaid()) return

      onClose()
    }

    document.addEventListener('keydown', heard)

    return () => document.removeEventListener('keydown', heard)
  }, [opened, onClose])

  return (
    <Card fill className="basalte-inspector" data-open={String(opened)}>
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
