// Ce qui dit qu’une chose se passe ou vient de se passer. La snackbar
// annonce une fois, en bas, et disparaît d’elle-même (D205) ; l’attente
// linéaire dit qu’un travail tourne, sous la barre d’application.

import { useEffect } from 'react'

import { Button } from './Button.js'

/** Combien de temps une snackbar reste : assez pour être lue, pas relue. */
const LINGER = 4000

type SnackbarProps = {
  readonly message: string | undefined
  readonly onDone: () => void
  /** Une action, quand le message en propose une : « Voir », « Annuler ». */
  readonly action?:
    { readonly label: string; readonly onClick: () => void } | undefined
}

export function Snackbar({ message, onDone, action }: SnackbarProps) {
  useEffect(() => {
    if (message === undefined) return

    const timer = window.setTimeout(onDone, LINGER)

    return () => window.clearTimeout(timer)
  }, [message, onDone])

  if (message === undefined) return null

  return (
    <div className="basalte-snackbar" role="status">
      <span>{message}</span>
      {action !== undefined && (
        <Button
          variant="text"
          size="sm"
          onClick={() => {
            action.onClick()
            onDone()
          }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function LinearProgress({ label }: { readonly label: string }) {
  return (
    <div
      className="basalte-progress"
      role="progressbar"
      aria-label={label}
      aria-busy="true"
    />
  )
}
