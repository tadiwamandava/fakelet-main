import type { HttpContext } from '@adonisjs/core/http'
import { createHash, randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/user'
import PasswordReset from '#models/password_reset'
import { sendPasswordResetEmail } from '#services/mail_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export default class PasswordResetsController {
  // POST /api/v1/auth/forgot-password
  async requestCode({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    // Always return the same message to prevent email enumeration
    const user = await User.findBy('email', email)
    if (!user) {
      return response.ok({ message: 'If that email is registered, a reset code has been sent.' })
    }

    const code = String(randomInt(100000, 999999))
    const codeHash = hashCode(code)

    // Invalidate any previous unused resets for this email
    await PasswordReset.query()
      .where('email', email)
      .whereNull('used_at')
      .update({ used_at: DateTime.now().toSQL() })

    await PasswordReset.create({
      email,
      codeHash,
      expiresAt: DateTime.now().plus({ minutes: 15 }),
    })

    await sendPasswordResetEmail(email, code)

    return response.ok({ message: 'If that email is registered, a reset code has been sent.' })
  }

  // POST /api/v1/auth/reset-password
  async resetPassword({ request, response }: HttpContext) {
    const { email, code, password } = await request.validateUsing(resetPasswordValidator)

    const codeHash = hashCode(code)
    const now = DateTime.now().toSQL()!

    const reset = await PasswordReset.query()
      .where('email', email)
      .where('code_hash', codeHash)
      .whereNull('used_at')
      .where('expires_at', '>', now)
      .first()

    if (!reset) {
      return response.unprocessableEntity({
        errors: [{ message: 'Invalid or expired reset code. Please request a new one.' }],
      })
    }

    const user = await User.findByOrFail('email', email)
    user.password = password
    await user.save()

    reset.usedAt = DateTime.now()
    await reset.save()

    return response.ok({ message: 'Password updated successfully. You can now sign in.' })
  }
}
