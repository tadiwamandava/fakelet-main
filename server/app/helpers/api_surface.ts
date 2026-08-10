import type { HttpContext } from '@adonisjs/core/http'

/**
 * This app serves two DISJOINT surfaces:
 *
 *   /api/v1/*    token guard ('api') only  | CSRF-exempt | Accept forced to JSON
 *   everything   session guard ('web') only | CSRF enforced | normal negotiation
 *
 * They must never overlap. A CSRF-exempt route that also accepts cookie auth
 * would be a genuine CSRF hole. What makes the exemption safe is that browsers
 * never auto-attach an `Authorization: Bearer` header, so a cross-site request
 * to an exempt /api/v1 route arrives unauthenticated and fails.
 *
 * If you ever need cookie auth on /api/v1, you must remove the CSRF exemption
 * in config/shield.ts in the same change.
 *
 * This predicate is the single source of truth for that split — it is used by
 * force_json_response_middleware, silent_auth_middleware, admin_middleware and
 * the shield CSRF config.
 */
export const API_PREFIX = '/api/v1'

export function isApiRequest(ctx: HttpContext): boolean {
  return ctx.request.url().startsWith(API_PREFIX)
}
