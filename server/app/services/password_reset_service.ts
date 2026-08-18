import { createHash, randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import User from '#models/user'
import PasswordReset from '#models/password_reset'
import { sendPasswordResetEmail } from '#services/mail_service'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * Issues a single-use, 15-minute reset code and emails it.
 *
 * Silently does nothing when the address is unknown — callers must respond
 * identically either way so the endpoint cannot be used to discover which
 * emails have accounts.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findBy('email', email)
  if (!user) return

  const code = String(randomInt(100000, 999999))

  // Invalidate any previous unused resets for this email
  await PasswordReset.query()
    .where('email', email)
    .whereNull('used_at')
    .update({ used_at: DateTime.now().toSQL() })

  await PasswordReset.create({
    email,
    codeHash: hashCode(code),
    expiresAt: DateTime.now().plus({ minutes: 15 }),
  })

  await sendPasswordResetEmail(email, code)
}

/**
 * Verifies a reset code and sets the new password.
 *
 * The password is hashed explicitly and written with a query builder update
 * rather than model.save(), because the withAuthFinder beforeSave hook proved
 * unreliable here and would store the password in plain text.
 *
 * @returns true when the code was valid and the password changed
 */
export async function consumePasswordReset(
  email: string,
  code: string,
  password: string
): Promise<boolean> {
  const reset = await PasswordReset.query()
    .where('email', email)
    .where('code_hash', hashCode(code))
    .whereNull('used_at')
    .where('expires_at', '>', DateTime.now().toSQL()!)
    .first()

  if (!reset) return false

  const user = await User.findByOrFail('email', email)
  await User.query().where('id', user.id).update({ password: await hash.make(password) })

  reset.usedAt = DateTime.now()
  await reset.save()

  return true
}
