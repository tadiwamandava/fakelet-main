import { join, basename, extname } from 'node:path'
import { existsSync, mkdirSync, createReadStream } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'
import { UPLOADS_DIR } from '#helpers/uploads'
import { findBoardForDisplay } from '#services/board_service'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export default class BoardsController {
  async index({ auth, response }: HttpContext) {
    // Only admins can browse every board. Viewers open specific boards via
    // shared links (GET /boards/:id), which stays public.
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const boards = await Board.query().orderBy('id')
    return boards
  }

  async show({ params }: HttpContext) {
    return findBoardForDisplay(params.id)
  }

  async store({ request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const { title, description, imageUrl } = request.only(['title', 'description', 'imageUrl']) as {
      title: string
      description?: string
      imageUrl?: string
    }
    if (!title?.trim()) return response.badRequest({ error: 'Title is required' })

    const board = await Board.create({
      title: title.trim(),
      description: description?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      createdBy: user.id,
    })
    return board
  }

  async update({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const board = await Board.findOrFail(params.id)
    const { title, imageUrl, description, references } = request.only([
      'title',
      'imageUrl',
      'description',
      'references',
    ])

    if (typeof title === 'string' && title.trim()) board.title = title.trim()
    if (typeof imageUrl === 'string') board.imageUrl = imageUrl || null
    if (typeof description === 'string') board.description = description.trim() || null
    if (Array.isArray(references)) {
      board.references = (references as unknown[]).filter(
        (r): r is string => typeof r === 'string' && r.trim() !== ''
      )
    }

    await board.save()
    return board
  }

  async destroy({ params, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const board = await Board.findOrFail(params.id)
    await board.delete()
    return response.noContent()
  }

  async uploadImage({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const image = request.file('image', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    if (!image) return response.badRequest({ error: 'No image provided' })
    if (!image.isValid) return response.badRequest({ errors: image.errors })

    mkdirSync(UPLOADS_DIR, { recursive: true })

    const filename = `${Date.now()}-${image.clientName?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'upload'}`
    await image.move(UPLOADS_DIR, { name: filename, overwrite: true })

    const board = await Board.findOrFail(params.id)
    board.imageUrl = `/uploads/${filename}`
    await board.save()

    return { imageUrl: board.imageUrl }
  }

  async serveUpload({ params, response }: HttpContext) {
    const filename = basename(params.filename)
    const filePath = join(UPLOADS_DIR, filename)

    if (!existsSync(filePath)) return response.notFound({ error: 'Not found' })

    const mime = MIME[extname(filename).toLowerCase()] ?? 'application/octet-stream'
    response.header('Content-Type', mime)
    response.header('Cache-Control', 'public, max-age=31536000')
    return response.stream(createReadStream(filePath))
  }
}
