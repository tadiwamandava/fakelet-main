import { mkdirSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Card from '#models/card'
import { UPLOADS_DIR } from '#helpers/uploads'
import * as writes from '#services/board_writes'

export default class CardsController {
  /**
   * POST /api/v1/cards
   *
   * Goes through the shared write service so the API gets the same parent
   * checks and server-assigned positions as the board UI. `position` in the
   * body is ignored; the database allocates the next free slot.
   */
  async store({ request, auth }: HttpContext) {
    const data = request.only([
      'groupId',
      'columnId',
      'title',
      'description',
      'imageUrl',
      'linkUrl',
      'linkTitle',
      'youtubeUrl',
    ])
    return writes.createCard(data, auth.user?.id ?? null)
  }

  /**
   * PUT /api/v1/cards/:id
   *
   * `version` is optional here. Sending the version the card was read at makes
   * the update fail rather than overwrite a concurrent change; omitting it
   * keeps the last-writer-wins behaviour existing integrations rely on.
   */
  async update({ params, request, auth }: HttpContext) {
    const attrs = {
      ...request.only(['title', 'description', 'imageUrl', 'linkUrl', 'linkTitle', 'youtubeUrl']),
      ...(request.input('groupId') !== undefined ? { groupId: request.input('groupId') } : {}),
      ...(request.input('columnId') !== undefined ? { columnId: request.input('columnId') } : {}),
    }
    const expected = Number(request.input('version'))
    return writes.updateCard(params.id, attrs, auth.user?.id ?? null, expected || null)
  }

  async uploadImage({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })
    await Card.findOrFail(params.id)

    const image = request.file('image', {
      size: '20mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })
    if (!image) return response.badRequest({ error: 'No image provided' })
    if (!image.isValid) return response.badRequest({ errors: image.errors })

    mkdirSync(UPLOADS_DIR, { recursive: true })
    const filename = `${Date.now()}-${image.clientName?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'upload'}`
    await image.move(UPLOADS_DIR, { name: filename, overwrite: true })

    return { imageUrl: `/uploads/${filename}` }
  }

  //DELETE /api/cards/:id - soft delete
  async destroy({ params, auth }: HttpContext) {
    await writes.softDeleteCard(params.id, auth.user?.id ?? null)
    return { deleted: true }
  }

  //POST /api/cards/reorder - persist a new order for a set of cards
  async reorder({ request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const ids = request.input('ids') as unknown
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'number')) {
      return response.badRequest({ error: 'ids must be an array of card ids' })
    }

    await writes.reorderCards(ids, user.id)
    return { ok: true }
  }
}
