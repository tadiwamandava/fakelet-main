import type { HttpContext } from '@adonisjs/core/http'
import * as writes from '#services/board_writes'

/**
 * Groups over the token API, sharing the board UI's write service so positions
 * and delete semantics match. Deleting a group moves its cards up into the
 * parent column instead of destroying them.
 */
export default class GroupsController {
  //POST /api/groups — `position` in the body is ignored; the server assigns it
  async store({ request, auth }: HttpContext) {
    const { columnId, title } = request.only(['columnId', 'title', 'position'])
    return writes.createGroup(Number(columnId), { title }, auth.user?.id ?? null)
  }

  //PUT /api/groups/:id
  async update({ params, request, auth }: HttpContext) {
    return writes.renameGroup(params.id, request.input('title'), auth.user?.id ?? null)
  }

  //DELETE /api/groups/:id — the group's cards survive as ungrouped cards
  async destroy({ params, auth }: HttpContext) {
    await writes.deleteGroup(params.id, auth.user?.id ?? null)
    return { deleted: true }
  }
}
