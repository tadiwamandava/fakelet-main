import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isApiRequest } from '#helpers/api_surface'

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
    await ctx.auth.use(isApiRequest(ctx) ? 'api' : 'web').check()

    return next()
  }
}
