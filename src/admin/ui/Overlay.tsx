// Ce qui flotte au-dessus de la page : la fenêtre, et le menu déroulant. Ce
// sont les deux seuls plans qui portent une vraie ombre.
//
// Une fenêtre du panel ne se démonte pas : seul son `opened` change. Elle ne
// rend rien tant qu’elle est fermée, et le composant qui la porte garde son
// état — c’est ce qui évite qu’un sélecteur rouvert propose le choix du
// précédent.
//
// Le volet d’un écran, lui, n’est pas une fenêtre : il change de forme sans
// se démonter, et sa couche s’arrête sous la barre d’application. C’est la
// feuille qui décide, jamais une lecture de la largeur.

import { useEffect, useRef, type ReactNode } from 'react'

import { IconButton } from './Button.js'
import { Chevron, Close } from './icons.js'

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Les fenêtres ouvertes, de la première à la dernière. La bibliothèque en
 * ouvre une seconde par-dessus la sienne, et sans cette pile une échappée les
 * fermait toutes les deux : seule celle du dessus écoute le clavier.
 */
const stack: HTMLElement[] = []

/**
 * Le curseur à l’ouverture. React pose `autoFocus` lui-même, avant cet effet et
 * sans laisser d’attribut à chercher : un champ déjà visé garde donc le
 * curseur, et le premier pas ne sert qu’à la fenêtre qui ne vise rien.
 */
function focusEntry(frame: HTMLElement): void {
  if (frame.contains(document.activeElement)) return

  frame.querySelector<HTMLElement>(FOCUSABLE)?.focus()
}

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
    const mine = frame.current

    if (!opened || mine === null) return

    const opener = document.activeElement
    const scroll = document.body.style.overflow

    stack.push(mine)
    document.body.style.overflow = 'hidden'
    focusEntry(mine)

    function onKey(event: KeyboardEvent): void {
      // Une fenêtre en couvre une autre : celle du dessous se tait.
      if (stack[stack.length - 1] !== mine) return

      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      // Le clavier ne sort pas d’une fenêtre ouverte : sans cela, la tabulation
      // repart dans la page éteinte derrière elle, où plus rien ne se voit.
      const stops = [...mine.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (stop) => stop.offsetParent !== null,
      )
      const edge = event.shiftKey ? stops[0] : stops[stops.length - 1]

      if (document.activeElement !== edge) return

      event.preventDefault()
      ;(event.shiftKey ? stops[stops.length - 1] : stops[0])?.focus()
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(mine), 1)

      if (stack.length === 0) document.body.style.overflow = scroll
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

/**
 * Le menu se ferme au clic ailleurs et à l’échappement, jamais tout seul.
 *
 * Il porte `group` et non `menu` : ce qu’il contient est de la prose ou des
 * lignes de liste, et `menu` promettrait des `menuitem` qu’un lecteur d’écran
 * chercherait en vain.
 */
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
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}

/**
 * Ce à quoi un menu s’accroche : il se pose sous lui, jamais sur la page.
 * Plein, il prend la largeur de sa colonne et le menu avec lui.
 */
export function Anchor({
  fill,
  children,
}: {
  readonly fill?: boolean | undefined
  readonly children: ReactNode
}) {
  return (
    <span
      className="basalte-anchor"
      data-fill={fill === true ? 'true' : undefined}
    >
      {children}
    </span>
  )
}

type SelectorProps = {
  /** Ce que l’on choisit : « Page », « Langue ». */
  readonly label: string
  /** Ce qui est choisi. */
  readonly value: ReactNode
  /** Une marque à côté du choix : les hachures d’une langue en préparation. */
  readonly mark?: ReactNode | undefined
  /** `bar` : une seule ligne, pour une barre d’outils. */
  readonly form?: 'field' | 'bar' | undefined
  readonly opened: boolean
  readonly onToggle: () => void
}

/**
 * Le bouton d’un choix parmi quelques-uns : ce qu’on choisit, ce qui est
 * choisi, et le chevron qui dit qu’un menu suit.
 *
 * En forme de champ, il empile les deux et se tient dans une colonne de
 * réglages, au-dessus de ce qu’il commande. En forme de barre, il les met sur
 * une ligne, le libellé en préfixe estompé : c’est l’adresse d’une chrome de
 * navigateur, et une barre d’outils n’a pas deux hauteurs à donner.
 */
export function Selector({
  label,
  value,
  mark,
  form,
  opened,
  onToggle,
}: SelectorProps) {
  return (
    <button
      type="button"
      className="basalte-selector"
      data-form={form}
      aria-haspopup="true"
      aria-expanded={opened}
      onClick={onToggle}
    >
      <span className="basalte-selector__text">
        <span className="basalte-selector__label">{label}</span>
        <span className="basalte-selector__value">{value}</span>
      </span>
      {mark}
      <Chevron />
    </button>
  )
}
