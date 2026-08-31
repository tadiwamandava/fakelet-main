import type { HttpContext } from '@adonisjs/core/http'
import * as writes from '#services/board_writes'

/**
 * Columns over the token API. The write service is shared with the board UI so
 * both surfaces enforce the same column cap, assign positions the same way, and
 * archive cards on delete rather than letting the cascade destroy them.
 */
export default class ColumnsController {
  //POST /api/columns — `position` in the body is ignored; the server assigns it
  async store({ request, auth }: HttpContext) {
    const { boardId, title } = request.only(['boardId', 'title', 'position'])
    return writes.createColumn(Number(boardId), { title }, auth.user?.id ?? null)
  }

  //PUT /api/columns/:id
  async update({ params, request, auth }: HttpContext) {
    return writes.renameColumn(params.id, request.input('title'), auth.user?.id ?? null)
  }

  //DELETE /api/columns/:id — removes the column; its cards are soft-deleted
  async destroy({ params, auth }: HttpContext) {
    await writes.deleteColumn(params.id, auth.user?.id ?? null)
    return { deleted: true }
  }
}
