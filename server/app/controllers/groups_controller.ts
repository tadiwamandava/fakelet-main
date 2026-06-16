import type { HttpContext } from '@adonisjs/core/http'
import Group from '#models/group'

export default class GroupsController {
  //POST /api/groups
  async store({ request, auth }: HttpContext) {
    const data = request.only(['column_id', 'title', 'position'])

    const group = await Group.create({ ...data, createdBy: auth.user?.id ?? null })
    return group
  }

  //PUT /api/groups/:id
  async update({ params, request, auth }: HttpContext) {
    const group = await Group.findOrFail(params.id)
    group.merge({
      ...request.only(['title', 'position']),
      updatedBy: auth.user?.id ?? null,
    })
    await group.save()
    return group
  }

  //DELETE /api/groups/:id
  async destroy({ params }: HttpContext) {
    const group = await Group.findOrFail(params.id)
    await group.delete()
    return { deleted: true }
  }
}
