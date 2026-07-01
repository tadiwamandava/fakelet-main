import type { HttpContext } from '@adonisjs/core/http'
import Invitation from '#models/invitation'
import { sendInvitationEmail } from '#services/mail_service'
import env from '#start/env'

export default class InvitationsController {
  async index({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const invitations = await Invitation.query()
      .preload('creator', (q) => q.select('id', 'email'))
      .orderBy('created_at', 'desc')

    return invitations.map((inv) => ({
      id: inv.id,
      key: inv.key,
      email: inv.email,
      createdAt: inv.createdAt,
      createdBy: inv.creator ? { id: inv.creator.id, email: inv.creator.email } : null,
      usedAt: inv.usedAt,
      usedBy: inv.usedBy,
    }))
  }

  async store({ request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const email = (request.input('email') as string | undefined)?.trim()
    if (!email) return response.badRequest({ error: 'Recipient email is required.' })

    const key = Invitation.generateKey()
    const invitation = await Invitation.create({ key, email, createdBy: user.id })

    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:5173')
    await sendInvitationEmail(email, key, frontendUrl)

    return {
      id: invitation.id,
      key: invitation.key,
      email: invitation.email,
      createdAt: invitation.createdAt,
      createdBy: { id: user.id, email: user.email },
      usedAt: null,
      usedBy: null,
    }
  }

  async destroy({ params, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const invitation = await Invitation.findOrFail(params.id)
    if (invitation.usedAt) return response.badRequest({ error: 'Cannot revoke a used invitation.' })

    await invitation.delete()
    return response.noContent()
  }
}
