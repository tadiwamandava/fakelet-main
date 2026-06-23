import type { HttpContext } from '@adonisjs/core/http'
import UserBookmark from '#models/user_bookmark'

export default class BookmarksController {
  async index({ auth }: HttpContext) {
    const user = await auth.authenticate()
    const bookmarks = await UserBookmark.query()
      .where('userId', user.id)
      .select('cardId')
    return { cardIds: bookmarks.map((b) => b.cardId) }
  }

  async toggle({ request, auth }: HttpContext) {
    const user = await auth.authenticate()
    const { cardId } = request.only(['cardId']) as { cardId: number }

    const existing = await UserBookmark.query()
      .where('userId', user.id)
      .where('cardId', cardId)
      .first()

    if (existing) {
      await existing.delete()
      return { bookmarked: false, cardId }
    }

    await UserBookmark.create({ userId: user.id, cardId })
    return { bookmarked: true, cardId }
  }
}
