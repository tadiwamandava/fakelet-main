import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'
import { searchCrossRef } from '#services/cross_ref_service'

export default class BoardsController {
  async index({ auth }: HttpContext) {
    await auth.authenticate()
    const boards = await Board.query().select('id', 'title', 'imageUrl').orderBy('id')
    return boards
  }

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

  async generateReferences({ params, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const board = await Board.query()
      .where('id', params.id)
      .preload('columns', (q) =>
        q.preload('groups', (q) =>
          q.preload('cards', (q) => q.where('is_deleted', false))
        )
      )
      .firstOrFail()

    // Collect unique search terms from all card titles + descriptions
    const seen = new Set<string>()
    const terms: string[] = []
    for (const col of board.columns) {
      for (const group of col.groups) {
        for (const card of group.cards) {
          const term = [card.title, card.description].filter(Boolean).join(' ').trim()
          if (term && !seen.has(term)) {
            seen.add(term)
            terms.push(term)
          }
        }
      }
    }

    // Search CrossRef for each term in parallel (cap at 10 to be polite)
    const results = await Promise.all(terms.slice(0, 10).map(searchCrossRef))
    const citations = results.filter((c): c is string => c !== null)

    board.references = citations
    await board.save()

    return { references: citations }
  }
}
