// Ce qui flotte au-dessus de la page : la fenêtre, et le menu déroulant. Ce
// sont les deux seuls plans qui portent une vraie ombre.
//
// Une fenêtre du panel ne se démonte pas : seul son `opened` change. Elle ne
// rend rien tant qu’elle est fermée, et le composant qui la porte garde son
// état — c’est ce qui évite qu’un sélecteur rouvert propose le choix du
// précédent.

import { useEffect, useRef, type ReactNode } from 'react'

import { IconButton } from './Button.js'
import { Close } from './icons.js'

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  readonly opened: boolean
  readonly title: string
  readonly note?: ReactNode | undefined
  readonly onClose: () => void
  readonly width?: string | undefined
  readonly foot?: ReactNode | undefined
  readonly children: ReactNode
}

export function Modal({
  opened,
  title,
  note,
  onClose,
  width,
  foot,
  children,
}: ModalProps) {
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!opened) return

    const opener = document.activeElement
    const first = frame.current?.querySelector<HTMLElement>(FOCUSABLE)

    first?.focus()

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || frame.current === null) return

      // Le clavier ne sort pas d’une fenêtre ouverte : sans cela, la tabulation
      // repart dans la page éteinte derrière elle, où plus rien ne se voit.
      const stops = [...frame.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const edge = event.shiftKey ? stops[0] : stops[stops.length - 1]

      if (document.activeElement !== edge) return

      event.preventDefault()
      ;(event.shiftKey ? stops[stops.length - 1] : stops[0])?.focus()
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)

      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [opened, onClose])

  if (!opened) return null

  return (
    <div
      className="basalte-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={frame}
        className="basalte-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width ?? 'var(--panel-width-form)' }}
      >
        <div className="basalte-modal__head">
          <div className="basalte-stack" data-gap="xs">
            <strong className="basalte-title" data-rank="card">
              {title}
            </strong>
            {note}
          </div>
          <span className="basalte-spacer" />
          <IconButton label="Fermer" onClick={onClose}>
            <Close />
          </IconButton>
        </div>
        <div className="basalte-modal__body">{children}</div>
        {foot !== undefined && (
          <div className="basalte-modal__foot">{foot}</div>
        )}
      </div>
    </div>
  )
}

type MenuProps = {
  readonly opened: boolean
  readonly onClose: () => void
  readonly align?: 'left' | undefined
  readonly label: string
  readonly children: ReactNode
}

/** Le menu se ferme au clic ailleurs et à l’échappement, jamais tout seul. */
export function Menu({ opened, onClose, align, label, children }: MenuProps) {
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!opened) return

    function onDown(event: MouseEvent): void {
      const inside = frame.current?.parentElement?.contains(
        event.target as Node,
      )

      if (inside !== true) onClose()
    }

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [opened, onClose])

  if (!opened) return null

  return (
    <div
      ref={frame}
      className="basalte-menu"
      data-align={align}
      role="menu"
      aria-label={label}
    >
      {children}
    </div>
  )
}

/** Ce à quoi un menu s’accroche : il se pose sous lui, jamais sur la page. */
export function Anchor({ children }: { readonly children: ReactNode }) {
  return <span className="basalte-anchor">{children}</span>
}
