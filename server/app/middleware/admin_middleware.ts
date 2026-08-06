import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Admin middleware authenticates the request and denies access to anyone who
 * is not an admin. Use it to guard write endpoints that must never be reachable
 * by non-admin (e.g. demoted) accounts.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = await ctx.auth.authenticate()
    if (!user.isAdmin) {
      return ctx.response.forbidden({ error: 'Forbidden' })
    }
    return next()
  }
}
