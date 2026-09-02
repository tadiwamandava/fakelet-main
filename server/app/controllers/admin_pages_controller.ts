import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import User from '#models/user'
import Invitation from '#models/invitation'
import { sendInvitationEmail } from '#services/mail_service'
import * as admin from '#services/admin_writes'

/**
 * Turns a refused access-control change into a message on the page.
 *
 * These are rules the user can act on — you cannot demote yourself, you cannot
 * remove the last master — not exceptional conditions, so they read better as a
 * flash on the dashboard than as an error page.
 */
async function guarded(ctx: HttpContext, run: () => Promise<unknown>) {
  try {
    await run()
    return true
  } catch (error) {
    if (error instanceof admin.AdminWriteError) {
      ctx.session.flash('inputErrorsBag', { user: error.message })
      return false
    }
    throw error
  }
}

/**
 * Admin dashboard: manage invitations and users.
 *
 * Every route here sits behind the admin middleware on the web guard, so the
 * controller does not repeat the authorization check. The routes that grant or
 * revoke access are additionally pinned to master admins in start/routes.ts.
 */
export default class AdminPagesController {
  /**
   * GET /admin
   */
  async index({ inertia, auth }: HttpContext) {
    /**
     * The log is only fetched for masters — it is the one thing on this page
     * an ordinary admin has no business reading, and skipping the query keeps
     * it off the wire rather than merely hidden in the UI.
     */
    const viewer = auth.getUserOrFail()

    return inertia.render('admin/index', {
      invitations: await this.listInvitations(),
      users: await this.listUsers(),
      auditLog: viewer.isMasterAdmin ? await this.listAuditLog() : [],
    })
  }

  private async listAuditLog() {
    const entries = await admin.listAuditLog()

    return entries.map((e) => ({
      id: e.id,
      action: e.action,
      summary: e.summary,
      actorEmail: e.actorEmail,
      createdAt: e.createdAt?.toISO() ?? null,
    }))
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
      isMasterAdmin: u.isMasterAdmin,
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
   * DELETE /admin/invitations/:id — master only.
   */
  async destroyInvitation(ctx: HttpContext) {
    const { params, auth, response } = ctx
    await guarded(ctx, () => admin.revokeInvitation(auth.getUserOrFail().id, params.id))
    return response.redirect().back()
  }

  /**
   * DELETE /admin/users/:id — master only.
   */
  async destroyUser(ctx: HttpContext) {
    const { params, auth, response } = ctx
    await guarded(ctx, () => admin.deleteUser(auth.getUserOrFail().id, Number(params.id)))
    return response.redirect().back()
  }

  /**
   * PATCH /admin/users/:id/admin — master only.
   */
  async toggleAdmin(ctx: HttpContext) {
    const { params, auth, response } = ctx
    await guarded(ctx, () => admin.toggleAdmin(auth.getUserOrFail().id, Number(params.id)))
    return response.redirect().back()
  }

  /**
   * PATCH /admin/users/:id/master — master only.
   */
  async toggleMaster(ctx: HttpContext) {
    const { params, auth, response } = ctx
    await guarded(ctx, () => admin.toggleMaster(auth.getUserOrFail().id, Number(params.id)))
    return response.redirect().back()
  }
}
