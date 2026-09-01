// Le recadrage d’une image, au format que l’emplacement attend.
//
// Le cadre est verrouillé au ratio : le client le déplace et le redimensionne,
// il ne le déforme pas. Ce qui sort n’est jamais l’image d’origine modifiée —
// c’est une nouvelle image, dérivée d’elle, qui reste dans la médiathèque.
//
// Le cadre se manie aussi au clavier : les flèches le déplacent, les flèches
// avec Maj le redimensionnent. Une poignée à la souris seule laisserait dehors
// qui ne se sert pas d’une souris.

import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useRef, useState } from 'react'

import { boxFor, parseRatio, ratioOf, type CropBox } from '../media/ratio.js'
import type { MediaSummary } from '../server/library.js'
import { cropMedia } from './api.js'
import { preview } from './Media.js'

/** Le pas d’une flèche, en pourcentage de l’image. */
const STEP = 2
const MIN_WIDTH = 5

/**
 * La hauteur maximale de l’aperçu. Le conteneur s’y borne par sa largeur plutôt
 * que par sa hauteur : le cadre est posé en pourcentage de ce conteneur, et une
 * image qui ne le remplirait pas entièrement décalerait tout ce qu’on y trace.
 */
const MAX_HEIGHT = '26rem'

export function CropDialog({
  origin,
  start,
  ratio,
  onDone,
  onClose,
  onError,
}: {
  readonly origin: MediaSummary | undefined
  readonly start: CropBox | undefined
  readonly ratio: string
  readonly onDone: (media: MediaSummary) => void
  readonly onClose: () => void
  readonly onError: (message: string) => void
}) {
  const [box, setBox] = useState<CropBox | undefined>(undefined)
  const [shown, setShown] = useState('')
  const [busy, setBusy] = useState(false)
  const frame = useRef<HTMLDivElement>(null)

  const opened = origin !== undefined

  // Le cadre suit l'image ouverte : sans cette remise à zéro, rouvrir la
  // fenêtre sur une autre photo garderait le cadre de la précédente.
  if (shown !== (origin?.key ?? '')) {
    setShown(origin?.key ?? '')
    setBox(undefined)
  }
  const initial =
    origin === undefined
      ? { x: 0, y: 0, width: 100, height: 100 }
      : (start ?? boxFor(origin, ratio, origin.focal))

  const current = box ?? initial
  const wanted = parseRatio(ratio) ?? 1
  const source = origin === undefined ? 1 : ratioOf(origin)

  // La hauteur découle de la largeur : c’est ce qui verrouille le format quel
  // que soit le geste, et ce qui rend la déformation impossible.
  const heightFor = (width: number) => (width * source) / wanted

  const place = (next: CropBox): void => {
    const width = clamp(next.width, MIN_WIDTH, 100)
    const height = heightFor(width)

    if (height > 100) {
      place({ ...next, width: (100 * wanted) / source })
      return
    }

    setBox({
      x: clamp(next.x, 0, 100 - width),
      y: clamp(next.y, 0, 100 - height),
      width,
      height,
    })
  }

  const close = () => {
    setBox(undefined)
    onClose()
  }

  const send = async () => {
    if (origin === undefined) return

    setBusy(true)

    const answer = await cropMedia(origin.key, current)

    setBusy(false)

    if (answer.ok) {
      setBox(undefined)
      onDone(answer.data.media)
      return
    }

    onError(answer.message)
  }

  // Le déplacement se mesure sur la boîte du conteneur : le cadre est exprimé
  // en pourcentage de l’image, et la vignette n’a pas la taille de l’originale.
  const drag = (event: React.PointerEvent, corner: boolean) => {
    const container = frame.current?.parentElement

    if (container === null || container === undefined) return

    event.preventDefault()
    event.stopPropagation()

    const bounds = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const from = current
    const target = event.currentTarget as HTMLElement

    target.setPointerCapture(event.pointerId)

    const move = (moved: PointerEvent) => {
      const dx = ((moved.clientX - startX) / bounds.width) * 100
      const dy = ((moved.clientY - startY) / bounds.height) * 100

      // À la poignée, les deux axes agrandissent : la hauteur découlant de la
      // largeur, un glissement vertical se traduit en largeur avant d'y entrer,
      // sans quoi descendre ne ferait rien.
      const grow = Math.abs(dx) > Math.abs(dy) ? dx : (dy * wanted) / source

      place(
        corner
          ? { ...from, width: from.width + grow }
          : { ...from, x: from.x + dx, y: from.y + dy },
      )
    }

    const stop = () => {
      target.releasePointerCapture(event.pointerId)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', stop)
      target.removeEventListener('pointercancel', stop)
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', stop)
    target.addEventListener('pointercancel', stop)
  }

  const key = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0 : STEP
    const grow = event.shiftKey ? STEP : 0

    const moves: Readonly<Record<string, CropBox>> = {
      ArrowLeft: {
        ...current,
        x: current.x - step,
        width: current.width - grow,
      },
      ArrowRight: {
        ...current,
        x: current.x + step,
        width: current.width + grow,
      },
      ArrowUp: {
        ...current,
        y: current.y - step,
        width: current.width - grow,
      },
      ArrowDown: {
        ...current,
        y: current.y + step,
        width: current.width + grow,
      },
    }

    const next = moves[event.key]

    if (next === undefined) return

    event.preventDefault()
    place(next)
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Recadrer l’image"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Placez le cadre sur ce qui doit rester visible. L’image d’origine est
          conservée : vous pouvez recommencer quand vous voulez.
        </Text>

        {origin !== undefined && (
          <div
            className="basalte-crop"
            style={{ maxWidth: `calc(${MAX_HEIGHT} * ${source})` }}
          >
            <img src={preview(origin)} alt="" draggable={false} />
            <div
              ref={frame}
              className="basalte-crop-frame"
              role="slider"
              tabIndex={0}
              aria-label={`Cadre ${ratio}, déplaçable aux flèches et redimensionnable avec Maj`}
              aria-valuemin={MIN_WIDTH}
              aria-valuemax={100}
              aria-valuenow={Math.round(current.width)}
              aria-valuetext={`Largeur ${Math.round(current.width)} %`}
              style={{
                left: `${current.x}%`,
                top: `${current.y}%`,
                width: `${current.width}%`,
                height: `${current.height}%`,
              }}
              onPointerDown={(event) => drag(event, false)}
              onKeyDown={key}
            >
              <span
                className="basalte-crop-handle"
                onPointerDown={(event) => drag(event, true)}
              />
            </div>
          </div>
        )}

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Proportions {ratio}
          </Text>
          <Group>
            <Button variant="default" onClick={close}>
              Annuler
            </Button>
            <Button loading={busy} onClick={send}>
              Recadrer
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high))
}
