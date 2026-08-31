import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { isApiRequest } from '#helpers/api_surface'
import { MissingTargetError, StaleWriteError, WriteRejectedError } from '#services/board_writes'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Render friendly pages for web requests in production. The token API is
   * excluded so it keeps returning JSON error bodies.
   */
  protected renderStatusPages = app.inProduction

  protected statusPages = {
    '404': (error: any, ctx: HttpContext) =>
      ctx.inertia.render('errors/not_found', { status: 404, message: error.message }),
    '500..599': (error: any, ctx: HttpContext) =>
      ctx.inertia.render('errors/server_error', { status: error.status ?? 500 }),
  }

  async handle(error: any, ctx: HttpContext) {
    /**
     * The rate limiter throws on the web login/signup routes too. Without this
     * the browser would get a bare 429 page (or an Inertia error modal) instead
     * of an inline message on the form.
     */
    if (error?.code === 'E_TOO_MANY_REQUESTS' && !isApiRequest(ctx)) {
      ctx.session?.flash('inputErrorsBag', {
        email: 'Too many attempts. Please wait a few minutes and try again.',
      })
      return ctx.response.redirect().back()
    }

    /**
     * Concurrency failures on the token API. The board UI catches these itself
     * and turns them into a flash message; here they need to be statuses a
     * client can branch on, not 500s. 409 says "re-read and retry", which is
     * exactly what both a lost race and a stale version call for.
     */
    if (isApiRequest(ctx)) {
      if (error instanceof StaleWriteError) {
        return ctx.response.conflict({ error: { code: 'E_STALE_WRITE', message: error.message } })
      }
      if (error instanceof MissingTargetError) {
        return ctx.response.conflict({ error: { code: 'E_MISSING_TARGET', message: error.message } })
      }
      if (error instanceof WriteRejectedError) {
        return ctx.response
          .unprocessableEntity({ error: { code: 'E_WRITE_REJECTED', message: error.message } })
      }
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
