import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import * as admin from '#services/admin_writes'

/**
 * Account administration over the token API.
 *
 * The same write service the dashboard uses, so the rules cannot drift between
 * the two surfaces — an /api/v1 route that skipped them would simply be the way
 * around the restriction. Authorization is on the routes: listing users needs
 * admin, everything that grants or revokes access needs master.
 */
export default class AdminController {
  async users({ response }: HttpContext) {
    const users = await User.query().orderBy('created_at', 'asc')
    return response.ok(users.map((u) => u.serialize()))
  }

  async deleteUser({ params, auth, response }: HttpContext) {
    return refused(response, () =>
      admin.deleteUser(auth.getUserOrFail().id, Number(params.id)).then(() => response.noContent())
    )
  }

  async toggleAdmin({ params, auth, response }: HttpContext) {
    return refused(response, async () => {
      const user = await admin.toggleAdmin(auth.getUserOrFail().id, Number(params.id))
      return response.ok(user.serialize())
    })
  }

  async toggleMaster({ params, auth, response }: HttpContext) {
    return refused(response, async () => {
      const user = await admin.toggleMaster(auth.getUserOrFail().id, Number(params.id))
      return response.ok(user.serialize())
    })
  }

  async revokeInvitation({ params, auth, response }: HttpContext) {
    return refused(response, () =>
      admin
        .revokeInvitation(auth.getUserOrFail().id, params.id)
        .then(() => response.noContent())
    )
  }
}

/**
 * A refused rule is a 422, not a 500: the request was understood and the caller
 * can act on the answer.
 */
async function refused(response: HttpContext['response'], run: () => Promise<unknown>) {
  try {
    return await run()
  } catch (error) {
    if (error instanceof admin.AdminWriteError) {
      return response.unprocessableEntity({
        error: { code: 'E_ADMIN_WRITE_REJECTED', message: error.message },
      })
    }
    throw error
  }
}
