import type { HttpContext } from '@adonisjs/core/http'
import Column from '#models/column'

export default class ColumnsController {
  //POST /api/columns
  async store({ request, response, auth }: HttpContext) {
    const data = request.only(['boardId', 'title', 'position'])

    //Enfore the max 8 columns for a board
    const count = await Column.query().where('board_id', data.boardId).count('* as total')

    if (Number(count[0].$extras.total) >= 8) {
      return response.badRequest({
        error: { message: 'A board can only have a maximum of 8 columns' },
      })
    }
    const column = await Column.create({ ...data, createdBy: auth.user?.id ?? null })
    return column
  }

  //PUT /api/columns/:id
  async update({ params, request, auth }: HttpContext) {
    const column = await Column.findOrFail(params.id)
    column.merge({
      ...request.only(['title', 'position']),
      updatedBy: auth.user?.id ?? null,
    })

    await column.save()
    return column
  }

  //DELETE /api/columns/:id -real delete; Cascade deletes groups and cards
  async destroy({ params }: HttpContext) {
    const column = await Column.findOrFail(params.id)
    await column.delete()
    return { deleted: true }
  }
}
