import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import User from '#models/user'
import Invitation from '#models/invitation'
import { sendInvitationEmail } from '#services/mail_service'

/**
 * Admin dashboard: manage invitations and users.
 *
 * Every route here sits behind the admin middleware on the web guard, so the
 * controller does not repeat the authorization check.
 */
export default class AdminPagesController {
  /**
   * GET /admin
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/index', {
      invitations: await this.listInvitations(),
      users: await this.listUsers(),
    })
  }

  private async listInvitations() {
    const invitations = await Invitation.query()
      .preload('creator', (q) => q.select('id', 'email'))
      .orderBy('created_at', 'desc')

    return invitations.map((inv) => ({
      id: inv.id,
      key: inv.key,
      email: inv.email,
      createdAt: inv.createdAt?.toISO() ?? null,
      createdBy: inv.creator ? { id: inv.creator.id, email: inv.creator.email } : null,
      usedAt: inv.usedAt?.toISO() ?? null,
      usedBy: inv.usedBy,
    }))
  }

  private async listUsers() {
    const users = await User.query().orderBy('created_at', 'asc')

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt?.toISO() ?? null,
    }))
  }

  /**
   * POST /admin/invitations
   */
  async storeInvitation({ request, auth, response, session }: HttpContext) {
    const email = (request.input('email') as string | undefined)?.trim()
    if (!email) {
      session.flash('inputErrorsBag', { email: 'Recipient email is required.' })
      return response.redirect().back()
    }

    const user = auth.getUserOrFail()
    const key = Invitation.generateKey()
    await Invitation.create({ key, email, createdBy: user.id })

    /**
     * The signup link is built from FRONTEND_URL when the app is served from a
     * different origin than the API, and otherwise from APP_URL.
     */
    await sendInvitationEmail(email, key, env.get('FRONTEND_URL') || env.get('APP_URL'))

    session.flash('notice', `Invitation sent to ${email}.`)
    return response.redirect().back()
  }

  /**
   * DELETE /admin/invitations/:id
   */
  async destroyInvitation({ params, response, session }: HttpContext) {
    const invitation = await Invitation.findOrFail(params.id)

    if (invitation.usedAt) {
      session.flash('inputErrorsBag', { invitation: 'Cannot revoke an invitation that was used.' })
      return response.redirect().back()
    }

    await invitation.delete()
    return response.redirect().back()
  }

  /**
   * DELETE /admin/users/:id
   */
  async destroyUser({ params, auth, response, session }: HttpContext) {
    const me = auth.getUserOrFail()
    if (me.id === Number(params.id)) {
      session.flash('inputErrorsBag', { user: 'You cannot delete your own account.' })
      return response.redirect().back()
    }

    const user = await User.findOrFail(params.id)
    await user.delete()
    return response.redirect().back()
  }

  /**
   * PATCH /admin/users/:id/admin
   */
  async toggleAdmin({ params, auth, response, session }: HttpContext) {
    const me = auth.getUserOrFail()
    if (me.id === Number(params.id)) {
      session.flash('inputErrorsBag', { user: 'You cannot change your own admin status.' })
      return response.redirect().back()
    }

    const user = await User.findOrFail(params.id)
    user.isAdmin = !user.isAdmin
    await user.save()
    return response.redirect().back()
  }
}
