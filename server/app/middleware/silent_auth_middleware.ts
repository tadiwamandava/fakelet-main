import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isApiRequest } from '#helpers/api_surface'
import { sessionIsStale } from '#helpers/web_session'

/**
 * Silently checks whether the user is logged in, without ever rejecting the
 * request. Runs globally so `ctx.auth.user` is populated everywhere — notably
 * for Inertia shared props on public pages (e.g. a shared board link, where an
 * anonymous visitor and a signed-in admin see the same route).
 *
 * The guard must match the surface: /api/v1 authenticates with bearer tokens,
 * every other route with the session cookie. A bare `ctx.auth.check()` would
 * always use the default ('api') guard and never see a web session.
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const guard = isApiRequest(ctx) ? 'api' : 'web'
    await ctx.auth.use(guard).check()

    /**
     * A master can end someone's browser sessions, and this is where that takes
     * effect. It has to run here rather than in the admin middleware, or a
     * signed-out session would still be treated as signed in everywhere else —
     * including on the public board page, which has no auth middleware at all.
     */
    if (guard === 'web') {
      const user = ctx.auth.use('web').user
      if (user && sessionIsStale(ctx, user)) await ctx.auth.use('web').logout()
    }

    return next()
  }
}
