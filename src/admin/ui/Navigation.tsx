// La navigation de Material : le rail sur un écran large, la barre en bas
// sur un écran étroit — les mêmes destinations, une icône dans une pastille
// et une étiquette dessous, le conteneur secondaire sous celle qui est
// ouverte (D204). Les deux sont rendus, et c’est la feuille qui montre l’un
// ou l’autre selon la classe de fenêtre : un état React qui lirait la
// largeur redessinerait tout le panel à chaque redimensionnement.
//
// La barre d’application tient le titre de l’écran, sa ligne de contexte et
// le seul endroit où l’on agit sur l’état du site. Le compte se tient
// derrière l’avatar : au pied du rail, ou au bout de la barre d’application
// quand le rail n’est pas là.

import { useState, type ReactNode } from 'react'

import { Count } from './Badge.js'
import { joined } from './Layout.js'
import { Anchor, Menu } from './Overlay.js'

export type Destination<T extends string> = {
  readonly value: T
  readonly label: string
  readonly icon: ReactNode
  /** Ce qui attend derrière la destination : des messages non lus. */
  readonly pending?: number | undefined
}

type NavigationProps<T extends string> = {
  readonly form: 'rail' | 'bar'
  readonly items: readonly Destination<T>[]
  readonly current: T
  readonly onChange: (value: T) => void
  /** Ce que le rail porte en tête : la marque du site. */
  readonly head?: ReactNode | undefined
  /** Ce que le rail porte au pied : l’avatar du compte. */
  readonly foot?: ReactNode | undefined
}

export function Navigation<T extends string>({
  form,
  items,
  current,
  onChange,
  head,
  foot,
}: NavigationProps<T>) {
  return (
    <nav
      className="basalte-nav"
      data-form={form}
      aria-label="Les écrans du panel"
    >
      {form === 'rail' && head}
      <ul className="basalte-nav__list">
        {items.map((item) => (
          <li key={item.value}>
            <button
              type="button"
              className="basalte-nav__item"
              data-on={item.value === current ? 'true' : undefined}
              aria-current={item.value === current ? 'page' : undefined}
              onClick={() => onChange(item.value)}
            >
              <span className="basalte-nav__indicator">
                {item.icon}
                {item.pending !== undefined && item.pending > 0 && (
                  <Count>{item.pending}</Count>
                )}
              </span>
              <span className="basalte-nav__label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {form === 'rail' && foot !== undefined && (
        <div className="basalte-nav__foot">{foot}</div>
      )}
    </nav>
  )
}

/** La marque du site : sa première lettre, sur la couleur principale. */
export function Brand({ name }: { readonly name: string }) {
  return (
    <span className="basalte-brand" aria-hidden="true">
      {initial(name)}
    </span>
  )
}

type AvatarProps = {
  /** L’adresse du compte : sa première lettre fait l’avatar. */
  readonly account: string
  readonly label: string
  readonly children: ReactNode
}

/** L’avatar du compte, et le menu qu’il ouvre. */
export function Avatar({ account, label, children }: AvatarProps) {
  const [opened, setOpened] = useState(false)

  return (
    <Anchor>
      <button
        type="button"
        className="basalte-avatar"
        aria-label={label}
        aria-expanded={opened}
        title={label}
        onClick={() => setOpened((state) => !state)}
      >
        {initial(account)}
      </button>
      <Menu opened={opened} onClose={() => setOpened(false)} label={label}>
        {children}
      </Menu>
    </Anchor>
  )
}

function initial(text: string): string {
  return (text.trim().charAt(0) || '?').toUpperCase()
}

type TopAppBarProps = {
  /** Le titre de l’écran, et ce qui l’accompagne sur sa ligne. */
  readonly title: ReactNode
  /** La ligne de contexte, au-dessus du titre. */
  readonly context?: ReactNode | undefined
  /** Ce qui agit sur l’état du site : enregistrer, mettre en ligne. */
  readonly actions?: ReactNode | undefined
  /**
   * Ce qui n’agit sur rien : l’aide, le compte. Sur un écran étroit, ils
   * restent sur la ligne du titre quand les actions passent dessous.
   */
  readonly tools?: ReactNode | undefined
  readonly className?: string | undefined
}

export function TopAppBar({
  title,
  context,
  actions,
  tools,
  className,
}: TopAppBarProps) {
  return (
    <header className={joined('basalte-appbar', className)}>
      <div className="basalte-stack" data-gap="xs">
        {context}
        {title}
      </div>
      {actions !== undefined && (
        <div className="basalte-appbar__actions">{actions}</div>
      )}
      {tools !== undefined && (
        <div className="basalte-appbar__tools">{tools}</div>
      )}
    </header>
  )
}
