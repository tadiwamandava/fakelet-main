import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Tells admins already looking at a board that it has changed.
 *
 * Only an invalidation is sent, never the board itself: the client answers by
 * re-fetching the `board` prop through the page it is already on, so there is
 * one serialization path rather than two that can drift apart. That also keeps
 * the payload small enough not to matter, and means permission checks stay in
 * the controller where they already are.
 *
 * Who may listen is decided by the channel authorization in #start/transmit.
 */
export function boardChannel(boardId: number) {
  return `boards/${boardId}`
}

/**
 * Announces a change to everyone on the board except whoever made it.
 *
 * The writer already has fresh props — an Inertia write redirects and returns
 * them — so echoing the notification back would only cost them a second,
 * pointless reload. The client sends its Transmit uid as `X-Hive-Client` for
 * exactly this purpose; without the header nothing is excluded, which is the
 * right fallback for the token API and for any client that does not subscribe.
 */
export function broadcastBoardChanged(ctx: HttpContext, boardId: number | null | undefined) {
  if (!boardId) return

  const origin = ctx.request.header('x-hive-client')
  transmit.broadcastExcept(boardChannel(boardId), { at: Date.now() }, origin ?? [])
}
