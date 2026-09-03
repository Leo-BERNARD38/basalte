// L’aperçu : la page telle que le dépôt la contient, dans un cadre qui dit le
// support regardé. Il est le même objet pour une page et pour un billet —
// deux écrans le portaient chacun, avec la même barre, et divergeaient.
//
// Le cadre montre le dernier enregistrement (D96). Il ne redimensionne pas la
// page pour la faire tenir : le rendu bureau est demandé à sa largeur
// d’écran, puis le cadre entier est réduit à l’échelle de la place qu’il a.
// Un aperçu « Bureau » posé dans une colonne de six cents pixels montrait
// sinon la mise en page tablette du site, et disait bureau. La réduction est
// une règle de la feuille, sur la largeur du conteneur, sans mesure en
// JavaScript. Le rendu mobile, lui, tient à sa taille.
//
// La bascule ne fait pas que redimensionner le cadre : elle demande le rendu
// du support à l’aperçu, qui les sert tous les deux (D25).

import { useState, type ReactNode } from 'react'

import { Desktop, External, Mobile } from './ui/icons.js'
import { Spacer } from './ui/Layout.js'
import { Text } from './ui/Text.js'
import { Segmented } from './ui/Toggle.js'

export type Viewport = 'desktop' | 'mobile'

const SUPPORTS = [
  {
    value: 'desktop' as const,
    label: (
      <>
        <Desktop />
        Bureau
      </>
    ),
  },
  {
    value: 'mobile' as const,
    label: (
      <>
        <Mobile />
        Mobile
      </>
    ),
  },
]

export function Stage({
  address,
  anchor,
  stale,
  frameKey,
  title,
  empty,
}: {
  /** L’adresse à montrer pour un support. Absente, il n’y a rien à montrer. */
  readonly address: ((support: Viewport) => string) | undefined
  /**
   * La section que le cadre amène en vue : son identifiant, que l’aperçu pose
   * sur chaque section. Changer le seul fragment d’une adresse fait défiler
   * le cadre sans le recharger.
   */
  readonly anchor?: string | undefined
  /** Vrai quand ce qu’on écrit n’est pas encore ce que le cadre montre. */
  readonly stale: boolean
  /** Ce qui, en changeant, recharge le cadre : le dernier enregistrement. */
  readonly frameKey: string
  readonly title: string
  /** Ce que le cadre porte quand il n’a rien à montrer. */
  readonly empty?: ReactNode | undefined
}) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const href = address?.(viewport)
  const shown =
    href === undefined || anchor === undefined || anchor === ''
      ? href
      : `${href}#${anchor}`

  return (
    <div className="basalte-stage">
      <div className="basalte-stage__screen" data-viewport={viewport}>
        <div className="basalte-stage__bar">
          <Segmented
            label="Le support regardé"
            value={viewport}
            items={SUPPORTS}
            onChange={setViewport}
          />

          <Spacer />

          {href !== undefined && (
            <a
              className="basalte-preview-link"
              href={href}
              target="_blank"
              rel="noopener"
            >
              <External />
              Ouvrir dans un onglet
            </a>
          )}
        </div>

        {href !== undefined && stale && (
          <Text className="basalte-stage__note" tone="meta" role="label-md">
            L’aperçu montre le dernier enregistrement. Enregistrez pour le voir
            se mettre à jour.
          </Text>
        )}

        {href === undefined ? (
          empty
        ) : (
          <div className="basalte-stage__viewport">
            <iframe
              key={`${frameKey}-${viewport}`}
              className="basalte-stage__frame"
              title={title}
              src={shown}
            />
          </div>
        )}
      </div>
    </div>
  )
}
