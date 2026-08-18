import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import type { InferSharedProps } from '@adonisjs/inertia/types'

/**
 * Inertia request handling, plus the props every page receives.
 *
 * @adonisjs/inertia v5 ships `BaseInertiaMiddleware` as an abstract class rather
 * than a ready-made middleware (and has no `sharedData` config key), so the app
 * subclasses it here — the equivalent of Laravel's HandleInertiaRequests.
 */
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  /**
   * Props merged into every page.
   */
  async share(ctx: HttpContext) {
    const user = ctx.auth.use('web').user

    return {
      /**
       * The signed-in admin, or null for an anonymous visitor on a shared board
       * link. Mirrors UserTransformer so the client sees one user shape.
       */
      auth: user ? { id: user.id, email: user.email, isAdmin: user.isAdmin } : null,

      /**
       * Validation errors from a failed submission, in Inertia's error shape.
       */
      errors: this.getValidationErrors(ctx),
    }
  }

  /**
   * The first-class flash bag, delivered alongside props.
   *
   * Load-bearing: an Inertia redirect returns no response body, so write
   * endpoints flash small payloads here (a new card's id, an uploaded imageUrl)
   * for the client to read. Keep them tiny — the session uses the cookie store.
   */
  flash(ctx: HttpContext) {
    return ctx.session?.flashMessages.all() ?? {}
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
  }
}

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<InertiaMiddleware> {}
}
