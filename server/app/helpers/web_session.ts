import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

/**
 * Signing a browser session out from the server, when the session lives in a
 * cookie.
 *
 * `SESSION_DRIVER=cookie` means the whole session is held by the browser and
 * there is no row to delete — the usual "destroy their session" move is simply
 * not available. Instead every session records when it began, and the user
 * carries a mark saying how old a session may be. Moving that mark to now ends
 * every outstanding session for the account, wherever it is.
 *
 * API tokens need none of this: `auth_access_tokens` is a real table, so those
 * rows are just deleted.
 */
const ISSUED_AT = 'auth_issued_at'

/** Records when this session began. Call on every path that logs someone in. */
export function stampSession(ctx: HttpContext) {
  ctx.session.put(ISSUED_AT, Date.now())
}

/**
 * Whether this session predates the account's most recent sign-out-everywhere.
 *
 * An account that has never been signed out short-circuits, so the mark being
 * absent — which it is for every account until a master uses this — can never
 * log anybody out. Once it is set, a session with no stamp at all is treated as
 * stale, because it was necessarily issued before the mark.
 */
export function sessionIsStale(ctx: HttpContext, user: User): boolean {
  const cutoff = user.sessionsValidFrom
  if (!cutoff) return false

  const issuedAt = Number(ctx.session.get(ISSUED_AT))
  if (!Number.isFinite(issuedAt)) return true

  return issuedAt < cutoff.toMillis()
}
