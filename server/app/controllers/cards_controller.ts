import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Card from '#models/card'

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

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

  async uploadImage({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

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
    const card = await Card.findOrFail(params.id)
    card.isDeleted = true
    card.updatedBy = auth.user?.id ?? null
    await card.save()
    return { deleted: true }
  }
}
