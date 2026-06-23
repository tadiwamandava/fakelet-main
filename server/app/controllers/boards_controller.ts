import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'

export default class BoardsController {
  async show({ params }: HttpContext) {
    const board = await Board.query()
      .where('id', params.id)
      .preload('columns', (columnQuery) =>
        columnQuery
          .orderBy('position')
          .preload('groups', (groupQuery) =>
            groupQuery
              .orderBy('position')
              .preload('cards', (cardQuery) =>
                cardQuery.where('is_deleted', false).orderBy('position')
              )
          )
      )
      .firstOrFail()

    return board
  }

  async update({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const board = await Board.findOrFail(params.id)
    const { references } = request.only(['references'])

    if (Array.isArray(references)) {
      board.references = (references as unknown[]).filter(
        (r): r is string => typeof r === 'string' && r.trim() !== ''
      )
    }

    await board.save()
    return board
  }
}
