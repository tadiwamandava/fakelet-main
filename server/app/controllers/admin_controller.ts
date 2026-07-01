import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AdminController {
  async users({ auth, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!me.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const users = await User.query().orderBy('created_at', 'asc')
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
  }

  async deleteUser({ params, auth, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!me.isAdmin) return response.forbidden({ error: 'Forbidden' })
    if (me.id === Number(params.id)) return response.badRequest({ error: 'Cannot delete your own account.' })

    const user = await User.findOrFail(params.id)
    await user.delete()
    return response.noContent()
  }

  async toggleAdmin({ params, auth, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!me.isAdmin) return response.forbidden({ error: 'Forbidden' })
    if (me.id === Number(params.id)) return response.badRequest({ error: 'Cannot change your own admin status.' })

    const user = await User.findOrFail(params.id)
    user.isAdmin = !user.isAdmin
    await user.save()
    return { id: user.id, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt, updatedAt: user.updatedAt }
  }
}
