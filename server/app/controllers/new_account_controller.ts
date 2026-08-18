import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { findUsableInvitation, redeemInvitation } from '#services/invitation_service'

export default class NewAccountController {
  async store({ request, serialize, response }: HttpContext) {
    const { password } = await request.validateUsing(signupValidator)

    const invitationKey = request.input('invitationKey') as string | undefined
    if (!invitationKey?.trim()) {
      return response.badRequest({
        errors: [{ message: 'An invitation key is required to create an account.' }],
      })
    }

    const invitation = await findUsableInvitation(invitationKey)
    if (!invitation) {
      return response.badRequest({
        errors: [{ message: 'Invalid or already-used invitation key.' }],
      })
    }

    const user = await redeemInvitation(invitation, password)
    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
