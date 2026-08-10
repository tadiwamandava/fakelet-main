import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isApiRequest } from '#helpers/api_surface'

/**
 * Forces JSON responses on the token API surface.
 *
 * Scoped to /api/v1 on purpose: applying this to every request would also force
 * JSON on the Inertia/HTML routes (and on error pages), which breaks server-side
 * rendering entirely. See #helpers/api_surface for the two-surface invariant.
 */
export default class ForceJsonResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    if (isApiRequest(ctx)) {
      ctx.request.request.headers.accept = 'application/json'
    }
    return next()
  }
}
