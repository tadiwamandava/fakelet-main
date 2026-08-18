import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { isApiRequest } from '#helpers/api_surface'

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
