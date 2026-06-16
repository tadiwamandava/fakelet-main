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
}
