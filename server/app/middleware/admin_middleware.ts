import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { isApiRequest } from '#helpers/api_surface'

/**
 * Admin middleware authenticates the request and denies access to anyone who
 * is not an admin. Use it to guard write endpoints that must never be reachable
 * by non-admin (e.g. demoted) accounts.
 *
 * Callers must pass the guard for their surface — `{ guards: ['api'] }` on
 * /api/v1 routes, `{ guards: ['web'] }` on Inertia page routes.
 *
 * `{ master: true }` raises the bar to a master admin, for the routes that
 * grant or revoke access. Master implies admin, so this is a narrowing of the
 * same check rather than a separate one — which is why it lives here instead of
 * in a second middleware that would have to repeat the surface handling below.
 */
export default class AdminMiddleware {
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
      master?: boolean
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })

    const user = ctx.auth.getUserOrFail()
    const allowed = options.master ? user.isMasterAdmin : user.isAdmin

    if (!allowed) {
      // A JSON body would be unreadable on an HTML page, so web requests get a
      // redirect instead.
      return isApiRequest(ctx)
        ? ctx.response.forbidden({ error: 'Forbidden' })
        : ctx.response.redirect(this.redirectTo)
    }

    return next()
  }
}
