import type { HttpContext } from '@adonisjs/core/http'
import Card from '#models/card'

export default class CardsController {
  //POST /api/cards
  async store({ request, auth }: HttpContext) {
    const data = request.only([
      'groupId',
      'title',
      'description',
      'imageUrl',
      'linkUrl',
      'linkTitle',
      'youtubeUrl',
      'position',
    ])
    const card = await Card.create({ ...data, createdBy: auth.user?.id ?? null })
    return card
  }

  //PUT /api/cards/:id
  async update({ params, request, auth }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    card.merge({
      ...request.only([
        'title',
        'description',
        'imageUrl',
        'linkUrl',
        'linkTitle',
        'youtubeUrl',
        'position',
      ]),
      updatedBy: auth.user?.id ?? null,
    })
    await card.save()
    return card
  }

  //DELETE /api/cards/:id - soft delete
  async destroy({ params, auth }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    card.isDeleted = true
    card.updatedBy = auth.user?.id ?? null
    await card.save()
    return { deleted: true }
  }
}
