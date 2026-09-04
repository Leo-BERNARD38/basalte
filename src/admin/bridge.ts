// Le canal entre le panel et son aperçu.
//
// L’aperçu n’est pas un témoin : c’est la surface sur laquelle le client
// travaille. Il remonte la section qu’on y clique et le rang où l’on demande
// une section de plus ; le panel, lui, dit ce qui est choisi, et si le cadre
// doit l’amener en vue.
//
// Le fragment d’adresse ne pouvait porter que le second sens, et il coûtait
// trois défauts : changer le `src` d’un cadre empile une entrée dans
// l’historique, que le panel emploie lui-même pour router ; rechoisir la
// section déjà visée ne rejouait rien ; et un fragment ne remonte rien. Les
// deux côtés se parlent donc par `postMessage`, sur la même origine.
//
// Module pur, comme `appearance.ts` : le panel l’importe depuis le
// navigateur, la route de l’aperçu depuis le serveur.
//
// Le script ne part que sur `/admin/preview/`, servie par le panel : le site
// construit ne le porte pas, et n’embarque toujours aucun JavaScript.

/** Ce qui distingue nos messages du reste du trafic d’une fenêtre. */
export const CHANNEL = 'basalte-preview'

/** Ce que l’aperçu dit au panel. */
export type FromPreview =
  /** Le cadre vient de charger : le panel lui redit ce qui est choisi. */
  | { readonly kind: 'ready' }
  /** Une section a été désignée dans l’aperçu. */
  | { readonly kind: 'picked'; readonly id: string }
  /** Une section de plus est demandée à ce rang, compté sur la page entière. */
  | { readonly kind: 'insert'; readonly at: number }

/**
 * Lit un message venu du cadre, et rend `undefined` pour tout ce qui n’est pas
 * de nous : une fenêtre reçoit le trafic de n’importe qui, et une extension de
 * navigateur en poste plus que l’aperçu.
 */
export function fromPreview(data: unknown): FromPreview | undefined {
  if (data === null || typeof data !== 'object') return undefined

  const message = data as Record<string, unknown>

  if (message['channel'] !== CHANNEL) return undefined

  const kind = message['kind']
  const id = message['id']
  const at = message['at']

  if (kind === 'ready') return { kind: 'ready' }
  if (kind === 'picked' && typeof id === 'string') return { kind: 'picked', id }
  if (kind === 'insert' && typeof at === 'number' && Number.isInteger(at)) {
    return { kind: 'insert', at }
  }

  return undefined
}

/**
 * Ce que le panel dit au cadre. `reveal` sépare les deux façons de choisir :
 * depuis le panel, la section vient en vue ; depuis un clic dans l’aperçu,
 * elle est déjà sous les yeux, et l’y amener ferait sauter la page.
 */
export function toPreview(
  id: string,
  reveal: boolean,
): Record<string, unknown> {
  return { channel: CHANNEL, kind: 'select', id, reveal }
}

/**
 * Ce que l’aperçu exécute. Écrit ici plutôt que dans le composant : c’est du
 * code, il se relit à côté de la forme des messages qu’il emploie.
 */
export const BRIDGE = `(function () {
  var panel = window.parent

  if (panel === window) return

  var origin = window.location.origin

  function tell(message) {
    message.channel = '${CHANNEL}'
    panel.postMessage(message, origin)
  }

  function mark(id, reveal) {
    var nodes = document.querySelectorAll('[data-section]')

    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].id !== id) {
        nodes[i].removeAttribute('data-current')
        continue
      }

      nodes[i].setAttribute('data-current', '')
      if (reveal) nodes[i].scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  document.addEventListener(
    'click',
    function (event) {
      var target =
        event.target instanceof Element ? event.target : null

      if (target === null) return

      var insert = target.closest('[data-insert]')

      if (insert !== null) {
        event.preventDefault()
        tell({ kind: 'insert', at: Number(insert.getAttribute('data-insert')) })
        return
      }

      // Rien ne navigue depuis l'apercu : c'est une surface d'edition, et
      // « Ouvrir dans un onglet » est la pour parcourir le site. Ce qui ne
      // navigue pas — le depliant du menu — garde son geste.
      if (target.closest('a[href], [type="submit"]')) event.preventDefault()

      var section = target.closest('[data-section]')

      if (section === null) return

      mark(section.id, false)
      tell({ kind: 'picked', id: section.id })
    },
    true,
  )

  window.addEventListener('message', function (event) {
    if (event.source !== panel || event.origin !== origin) return

    var data = event.data

    if (data === null || typeof data !== 'object') return
    if (data.channel !== '${CHANNEL}' || data.kind !== 'select') return

    mark(typeof data.id === 'string' ? data.id : '', data.reveal === true)
  })

  tell({ kind: 'ready' })
})()`
