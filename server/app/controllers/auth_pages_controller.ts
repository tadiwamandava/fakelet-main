import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, resetPasswordValidator, signupValidator } from '#validators/user'
import { forgotPasswordValidator } from '#validators/user'
import { findUsableInvitation, redeemInvitation } from '#services/invitation_service'
import { consumePasswordReset, requestPasswordReset } from '#services/password_reset_service'
import { stampSession } from '#helpers/web_session'

const DEFAULT_REDIRECT = '/boards'

/**
 * Only same-site absolute paths are allowed as a post-login destination.
 *
 * Rejects "//evil.com" as well as "https://evil.com": the browser treats a
 * protocol-relative URL as an absolute one, so a naive startsWith('/') check
 * would hand an attacker an open redirect.
 */
function safeRedirect(target: unknown): string {
  if (typeof target !== 'string') return DEFAULT_REDIRECT
  if (!target.startsWith('/') || target.startsWith('//')) return DEFAULT_REDIRECT
  return target
}

export default class AuthPagesController {
  /**
   * GET /login
   */
  async showLogin({ inertia, request, auth, response }: HttpContext) {
    if (await auth.use('web').check()) {
      return response.redirect(safeRedirect(request.input('redirect')))
    }

    return inertia.render('auth/login', {
      redirect: safeRedirect(request.input('redirect')),
    })
  }

  /**
   * POST /login
   */
  async login(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const { email, password } = await request.validateUsing(loginValidator)

    const redirectTo = safeRedirect(request.input('redirect'))

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      // Records when this session began, so it can be invalidated later.
      stampSession(ctx)
    } catch {
      session.flashAll()
      session.flash('inputErrorsBag', { email: 'Those credentials do not match our records.' })
      // Explicit rather than redirect().back(), which depends on a Referer
      // header and would land on "/" when it is absent.
      return response.redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`)
    }

    return response.redirect(redirectTo)
  }

  /**
   * GET /signup — the invitation is resolved server-side, so the page knows up
   * front whether the key is usable instead of discovering it on submit.
   */
  async showSignup({ inertia, request }: HttpContext) {
    const key = request.input('key') as string | undefined
    const invitation = await findUsableInvitation(key)

    return inertia.render('auth/signup', {
      invitationKey: key ?? '',
      email: invitation?.email ?? '',
      valid: !!invitation,
    })
  }

  /**
   * POST /signup
   */
  async signup(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const { password } = await request.validateUsing(signupValidator)

    const invitation = await findUsableInvitation(request.input('invitationKey'))
    if (!invitation) {
      session.flash('inputErrorsBag', { invitationKey: 'Invalid or already-used invitation key.' })
      return response.redirect().back()
    }

    const user = await redeemInvitation(invitation, password)
    await auth.use('web').login(user)
    stampSession(ctx)

    return response.redirect(DEFAULT_REDIRECT)
  }

  /**
   * POST /forgot-password
   */
  async forgotPassword({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    await requestPasswordReset(email)

    // Same outcome whether or not the address exists, to prevent enumeration
    session.flash('notice', 'If that email is registered, a reset code has been sent.')
    return response.redirect().back()
  }

  /**
   * POST /reset-password
   */
  async resetPassword({ request, response, session }: HttpContext) {
    const { email, code, password } = await request.validateUsing(resetPasswordValidator)

    const ok = await consumePasswordReset(email, code, password)
    if (!ok) {
      session.flash('inputErrorsBag', { code: 'Invalid or expired reset code. Please request a new one.' })
      return response.redirect().back()
    }

    session.flash('notice', 'Password updated. You can now sign in.')
    return response.redirect('/login')
  }

  /**
   * POST /logout
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
