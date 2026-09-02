import type { HttpContext } from '@adonisjs/core/http'
import Invitation from '#models/invitation'
import { sendInvitationEmail } from '#services/mail_service'
import { AdminWriteError, revokeInvitation } from '#services/admin_writes'
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

    /**
     * Base URL the signup link is built from. FRONTEND_URL is only needed when
     * the app is served from a different origin than the API; when both share a
     * domain, APP_URL is already correct.
     */
    const frontendUrl = env.get('FRONTEND_URL') || env.get('APP_URL')
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

  /**
   * DELETE /api/v1/invitations/:id — master only, matching the dashboard.
   *
   * Goes through the shared service so the rule is written once; the route
   * carries the master check.
   */
  async destroy({ params, auth, response }: HttpContext) {
    try {
      await revokeInvitation(auth.getUserOrFail().id, params.id)
      return response.noContent()
    } catch (error) {
      if (error instanceof AdminWriteError) {
        return response.unprocessableEntity({
          error: { code: 'E_ADMIN_WRITE_REJECTED', message: error.message },
        })
      }
      throw error
    }
  }
}
