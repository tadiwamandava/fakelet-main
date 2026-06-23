import { join, basename, extname } from 'node:path'
import { existsSync, mkdirSync, createReadStream } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'
import { searchCrossRef } from '#services/cross_ref_service'

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

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

  async store({ request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const { title } = request.only(['title']) as { title: string }
    if (!title?.trim()) return response.badRequest({ error: 'Title is required' })

    const board = await Board.create({ title: title.trim(), createdBy: user.id })
    return board
  }

  async update({ params, request, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (!user.isAdmin) return response.forbidden({ error: 'Forbidden' })

    const board = await Board.findOrFail(params.id)
    const { title, imageUrl, references } = request.only(['title', 'imageUrl', 'references'])

    if (typeof title === 'string' && title.trim()) board.title = title.trim()
    if (typeof imageUrl === 'string') board.imageUrl = imageUrl || null
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

    const results = await Promise.all(terms.slice(0, 10).map(searchCrossRef))
    const citations = results.filter((c): c is string => c !== null)

    board.references = citations
    await board.save()

    return { references: citations }
  }
}
