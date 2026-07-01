import type { HttpContext } from '@adonisjs/core/http'
import Invitation from '#models/invitation'

export default class InvitationsController {
  async index({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const invitations = await Invitation.query()
      .preload('creator', (q) => q.select('id', 'username', 'full_name'))
      .orderBy('created_at', 'desc')

    return invitations.map((inv) => ({
      id: inv.id,
      key: inv.key,
      createdAt: inv.createdAt,
      createdBy: inv.creator ? { id: inv.creator.id, username: inv.creator.username } : null,
      usedAt: inv.usedAt,
      usedBy: inv.usedBy,
    }))
  }

  async store({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const key = Invitation.generateKey()
    const invitation = await Invitation.create({ key, createdBy: user.id })

    return {
      id: invitation.id,
      key: invitation.key,
      createdAt: invitation.createdAt,
      createdBy: { id: user.id, username: user.username },
      usedAt: null,
      usedBy: null,
    }
  }

  async destroy({ params, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const invitation = await Invitation.findOrFail(params.id)
    if (invitation.usedAt) return response.badRequest({ error: 'Cannot revoke a used invitation' })

    await invitation.delete()
    return response.noContent()
  }
}
