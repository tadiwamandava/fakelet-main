import type { HttpContext } from '@adonisjs/core/http'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import { consumePasswordReset, requestPasswordReset } from '#services/password_reset_service'

const SENT_MESSAGE = 'If that email is registered, a reset code has been sent.'

export default class PasswordResetsController {
  // POST /api/v1/auth/forgot-password
  async requestCode({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    await requestPasswordReset(email)

    // Same response whether or not the address exists, to prevent enumeration
    return response.ok({ message: SENT_MESSAGE })
  }

  // POST /api/v1/auth/reset-password
  async resetPassword({ request, response }: HttpContext) {
    const { email, code, password } = await request.validateUsing(resetPasswordValidator)

    const ok = await consumePasswordReset(email, code, password)
    if (!ok) {
      return response.unprocessableEntity({
        errors: [{ message: 'Invalid or expired reset code. Please request a new one.' }],
      })
    }

    return response.ok({ message: 'Password updated successfully. You can now sign in.' })
  }
}
