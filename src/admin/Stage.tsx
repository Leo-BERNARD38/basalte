// L’aperçu : la page telle que le dépôt la contient, dans un cadre qui dit le
// support regardé. Il est le même objet pour une page et pour un billet —
// deux écrans le portaient chacun, avec la même barre, et divergeaient.
//
// C’est aussi la surface de travail : on y désigne une section en cliquant
// dessus, et on y demande une section de plus entre deux autres. Le dialogue
// avec le cadre passe par `bridge.ts`, dans les deux sens.
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

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { fromPreview, toPreview } from './bridge.js'
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
  selection = '',
  onPick,
  onInsert,
  bar,
  stale,
  frameKey,
  title,
  empty,
}: {
  /** L’adresse à montrer pour un support. Absente, il n’y a rien à montrer. */
  readonly address: ((support: Viewport) => string) | undefined
  /** La section choisie, que le cadre souligne. Vide : aucune. */
  readonly selection?: string | undefined
  /** Ce que le clic sur une section dans l’aperçu remonte. */
  readonly onPick?: ((id: string) => void) | undefined
  /** L’identifiant de la section avant laquelle une section est demandée. */
  readonly onInsert?: ((before: string) => void) | undefined
  /** Ce que la barre porte à gauche : le choix de la page, s’il y en a un. */
  readonly bar?: ReactNode | undefined
  /** Vrai quand ce qu’on écrit n’est pas encore ce que le cadre montre. */
  readonly stale: boolean
  /** Ce qui, en changeant, recharge le cadre : le dernier enregistrement. */
  readonly frameKey: string
  readonly title: string
  /** Ce que le cadre porte quand il n’a rien à montrer. */
  readonly empty?: ReactNode | undefined
}) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const frame = useRef<HTMLIFrameElement>(null)
  /** La dernière section venue de l’aperçu : elle y est déjà sous les yeux. */
  const picked = useRef('')
  /**
   * L’aperçu répond au clic tant que quelqu’un écoute. Sur une entrée fixe —
   * l’en-tête et le pied — il montre l’accueil, dont les sections
   * appartiennent à une autre entrée : personne n’écoute, et le cadre cesse
   * alors de se proposer.
   */
  const live = onPick !== undefined || onInsert !== undefined
  /** Ce que le rendu courant sait, pour n’écouter le canal qu’une fois. */
  const answer = useRef({ onPick, onInsert, selection, live })

  useEffect(() => {
    answer.current = { onPick, onInsert, selection, live }
  })

  useEffect(() => {
    function heard(event: MessageEvent): void {
      const mine = frame.current?.contentWindow

      if (event.origin !== window.location.origin) return
      if (mine === null || mine === undefined || event.source !== mine) return

      const message = fromPreview(event.data)

      if (message === undefined) return

      if (message.kind === 'ready') {
        // Le cadre est remonté — un enregistrement, un changement de page :
        // c’est lui qui redemande la marque, plutôt que le panel qui devine
        // quand la poser. Elle vient en vue, sauf sur la section qu’on venait
        // de désigner dans l’aperçu.
        mine.postMessage(
          toPreview(
            answer.current.selection,
            answer.current.selection !== picked.current,
            answer.current.live,
          ),
          event.origin,
        )
        return
      }

      if (message.kind === 'insert') {
        answer.current.onInsert?.(message.before)
        return
      }

      picked.current = message.id
      answer.current.onPick?.(message.id)
    }

    window.addEventListener('message', heard)

    return () => window.removeEventListener('message', heard)
  }, [])

  useEffect(() => {
    // Choisie depuis le panel, la section vient en vue ; désignée dans
    // l’aperçu, elle y est déjà, et l’y amener ferait sauter la page.
    frame.current?.contentWindow?.postMessage(
      toPreview(selection, selection !== picked.current, live),
      window.location.origin,
    )
  }, [selection, live])

  const href = address?.(viewport)

  return (
    <div className="basalte-stage">
      <div className="basalte-stage__screen" data-viewport={viewport}>
        <div className="basalte-stage__bar">
          {bar}

          <Spacer />

          <Segmented
            label="Le support regardé"
            value={viewport}
            items={SUPPORTS}
            onChange={setViewport}
          />

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
              ref={frame}
              key={`${frameKey}-${viewport}`}
              className="basalte-stage__frame"
              title={title}
              src={href}
            />
          </div>
        )}
      </div>
    </div>
  )
}
