import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Transmit } from '@adonisjs/transmit-client'

/**
 * Live board updates.
 *
 * Two admins on one board each hold their own snapshot, and nothing tells
 * either of them when the other saves. The writes themselves are safe — they
 * are version-checked and refused rather than applied over each other — but
 * until you touch something you still see a board that may be minutes old,
 * including columns someone else has already deleted.
 *
 * The server broadcasts only "board N changed"; this asks Inertia to re-fetch
 * the `board` prop through the page already on screen. Nothing here knows the
 * shape of a board, so the live path cannot drift from the HTTP one.
 */

let transmit: Transmit | null = null

/** Shield's CSRF token, which the subscribe POST has to carry. */
function xsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * One connection per tab, opened on first use.
 *
 * `__transmit/subscribe` is an ordinary session-authenticated route, so CSRF
 * applies to it and the token is attached by hand — the client posts with plain
 * fetch and would not send it otherwise. Exempting the route instead would
 * break the invariant documented in #helpers/api_surface.
 */
function getTransmit(): Transmit {
  if (!transmit) {
    transmit = new Transmit({
      baseUrl: window.location.origin,
      beforeSubscribe: (request) => request.headers.set('X-XSRF-TOKEN', xsrfToken()),
    })
  }
  return transmit
}

/**
 * This tab's connection id, sent on every write so the server can leave the
 * writer out of the broadcast — their redirect already returned fresh props,
 * so echoing to them would only buy a second, pointless reload.
 *
 * Deliberately does not open a connection: a client that never subscribed has
 * no id, and the server then simply excludes nobody.
 */
export function clientUid(): string {
  return transmit?.uid ?? ''
}

/**
 * Keeps the board on screen in step with the server.
 *
 * `enabled` is the admin check. Students read boards through a public link and
 * are not authorised on the channel, so subscribing would only earn them a 403
 * — they keep the page they loaded until they refresh it.
 *
 * Reloads are debounced, because one user action (a delete, a reorder) can
 * produce several writes in quick succession and each would otherwise cost a
 * round trip. While the tab is hidden nothing is fetched at all; it catches up
 * once on becoming visible again.
 */
export function useBoardChannel(boardId: number, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let missedWhileHidden = false

    function refresh() {
      /**
       * `reload` always preserves state and scroll — its options type excludes
       * both — which is what makes this unobtrusive: edit mode, the search box,
       * collapsed groups and an open card editor all survive, so a board
       * updating underneath someone never interrupts what they are doing.
       */
      router.reload({ only: ['board'] })
    }

    function schedule() {
      if (document.hidden) {
        missedWhileHidden = true
        return
      }
      clearTimeout(timer)
      timer = setTimeout(refresh, 500)
    }

    function onVisibilityChange() {
      if (!document.hidden && missedWhileHidden) {
        missedWhileHidden = false
        schedule()
      }
    }

    const subscription = getTransmit().subscription(`boards/${boardId}`)
    const stopListening = subscription.onMessage(schedule)

    /**
     * A failed subscribe is not worth surfacing. The board still works; it
     * simply stops updating on its own, which is how it behaved before.
     */
    subscription.create().catch(() => {})
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopListening()
      subscription.delete().catch(() => {})
    }
  }, [boardId, enabled])
}
