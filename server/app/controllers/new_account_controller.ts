import User from '#models/user'
import Invitation from '#models/invitation'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { DateTime } from 'luxon'

export default class NewAccountController {
  async store({ request, serialize, response }: HttpContext) {
    const { username, fullName, email, password } = await request.validateUsing(signupValidator)

    const invitationKey = request.input('invitationKey') as string | undefined

    let isAdmin = false
    let invitation: Invitation | null = null

    if (invitationKey) {
      invitation = await Invitation.query()
        .where('key', invitationKey.trim())
        .whereNull('used_at')
        .first()

      if (!invitation) {
        return response.badRequest({ errors: [{ message: 'Invalid or already-used invitation key.' }] })
      }

      isAdmin = true
    }

    const user = await User.create({ username, fullName, email, password, isAdmin })

    if (invitation) {
      invitation.usedAt = DateTime.now()
      invitation.usedBy = user.id
      await invitation.save()
    }

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
