import { mkdirSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'
import Column from '#models/column'
import Group from '#models/group'
import Card from '#models/card'
import { findBoardForDisplay } from '#services/board_service'
import { UPLOADS_DIR } from '#helpers/uploads'

const MAX_COLUMNS = 8

/**
 * Stores an uploaded image and returns its public path.
 */
async function storeImage(request: HttpContext['request']) {
  const image = request.file('image', {
    size: '20mb',
    extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  })
  if (!image || !image.isValid) return null

  mkdirSync(UPLOADS_DIR, { recursive: true })
  const filename = `${Date.now()}-${image.clientName?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'upload'}`
  await image.move(UPLOADS_DIR, { name: filename, overwrite: true })

  return `/uploads/${filename}`
}

/**
 * Inertia pages and writes for boards and their contents.
 *
 * Writes redirect back rather than returning a body, so anything the client
 * needs afterwards (a new card's id, an uploaded imageUrl) is flashed as
 * `created` and picked up by the mutations shim. Keep those payloads small —
 * the session uses the cookie store.
 */
export default class BoardPagesController {
  /**
   * GET /boards — admin only. Viewers reach a specific board through a shared
   * link and never browse the full list.
   */
  async index({ inertia }: HttpContext) {
    const boards = await Board.query().orderBy('id')

    return inertia.render('boards/index', {
      boards: boards.map((board) => ({
        id: board.id,
        title: board.title,
        description: board.description,
        imageUrl: board.imageUrl,
      })),
    })
  }

  /**
   * POST /boards
   *
   * Accepts the cover in the same request as the rest of the form, either as an
   * uploaded file or a URL. The SPA had to create the board first and upload
   * afterwards because it needed the new id; a redirect makes that unnecessary.
   */
  async storeBoard({ request, auth, response, session }: HttpContext) {
    const { title, description, imageUrl } = request.only(['title', 'description', 'imageUrl'])

    if (!title?.trim()) {
      session.flash('inputErrorsBag', { title: 'Title is required.' })
      return response.redirect().back()
    }

    const uploaded = await storeImage(request)

    const board = await Board.create({
      title: title.trim(),
      description: description?.trim() || null,
      imageUrl: uploaded ?? (imageUrl?.trim() || null),
      createdBy: auth.user?.id ?? null,
    })

    session.flash('created', { id: board.id })
    return response.redirect().back()
  }

  /**
   * DELETE /boards/:id
   */
  async destroyBoard({ params, response }: HttpContext) {
    const board = await Board.findOrFail(params.id)
    await board.delete()
    return response.redirect().back()
  }

  /**
   * GET /boards/:id — public. A shared link must open for a signed-out visitor,
   * so this route carries no auth middleware; silent_auth still resolves an
   * admin when one is signed in, and the shared `auth` prop decides whether the
   * page renders editing controls.
   */
  async show({ params, request, inertia }: HttpContext) {
    const board = await findBoardForDisplay(params.id)

    return inertia.render('boards/show', {
      /**
       * serialize() is typed as a loose ModelObject, so it is cast to the shape
       * the page declares. The preload in findBoardForDisplay is what actually
       * guarantees columns/groups/cards are present.
       */
      board: board.serialize() as any,
      highlight: Number(request.input('highlight')) || null,
    })
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  async storeColumn({ request, auth, response, session }: HttpContext) {
    const data = request.only(['boardId', 'title', 'position'])

    const count = await Column.query().where('board_id', data.boardId).count('* as total')
    if (Number(count[0].$extras.total) >= MAX_COLUMNS) {
      session.flash('inputErrorsBag', {
        title: `A board can only have a maximum of ${MAX_COLUMNS} columns.`,
      })
      return response.redirect().back()
    }

    const column = await Column.create({ ...data, createdBy: auth.user?.id ?? null })
    session.flash('created', { id: column.id })
    return response.redirect().back()
  }

  async updateColumn({ params, request, auth, response }: HttpContext) {
    const column = await Column.findOrFail(params.id)
    column.merge({ ...request.only(['title', 'position']), updatedBy: auth.user?.id ?? null })
    await column.save()
    return response.redirect().back()
  }

  async destroyColumn({ params, response }: HttpContext) {
    const column = await Column.findOrFail(params.id)
    await column.delete()
    return response.redirect().back()
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  async storeGroup({ request, auth, response, session }: HttpContext) {
    const group = await Group.create({
      ...request.only(['columnId', 'title', 'position']),
      createdBy: auth.user?.id ?? null,
    })
    session.flash('created', { id: group.id })
    return response.redirect().back()
  }

  async updateGroup({ params, request, auth, response }: HttpContext) {
    const group = await Group.findOrFail(params.id)
    group.merge({ ...request.only(['title', 'position']), updatedBy: auth.user?.id ?? null })
    await group.save()
    return response.redirect().back()
  }

  async destroyGroup({ params, response }: HttpContext) {
    const group = await Group.findOrFail(params.id)
    await group.delete()
    return response.redirect().back()
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  async storeCard({ request, auth, response, session }: HttpContext) {
    const card = await Card.create({
      ...request.only([
        'groupId',
        'columnId',
        'title',
        'description',
        'imageUrl',
        'linkUrl',
        'linkTitle',
        'youtubeUrl',
        'position',
      ]),
      createdBy: auth.user?.id ?? null,
    })

    // The board page opens the editor on the card it just created.
    session.flash('created', { id: card.id })
    return response.redirect().back()
  }

  async updateCard({ params, request, auth, response }: HttpContext) {
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
        'groupId',
        'columnId',
      ]),
      updatedBy: auth.user?.id ?? null,
    })
    await card.save()
    return response.redirect().back()
  }

  async destroyCard({ params, auth, response }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    card.isDeleted = true
    card.updatedBy = auth.user?.id ?? null
    await card.save()
    return response.redirect().back()
  }

  async reorderCards({ request, auth, response }: HttpContext) {
    const ids = request.input('ids') as unknown
    if (Array.isArray(ids)) {
      await Promise.all(
        ids
          .filter((id) => typeof id === 'number')
          .map((id, index) =>
            Card.query().where('id', id).update({ position: index, updatedBy: auth.user?.id ?? null })
          )
      )
    }
    return response.redirect().back()
  }

  async uploadCardImage({ params, request, response, session }: HttpContext) {
    await Card.findOrFail(params.id)

    const imageUrl = await storeImage(request)
    if (!imageUrl) {
      session.flash('inputErrorsBag', { image: 'Please choose a valid image under 20MB.' })
      return response.redirect().back()
    }

    // The card editor previews the stored file straight away.
    session.flash('created', { imageUrl })
    return response.redirect().back()
  }

  // ── Board metadata ─────────────────────────────────────────────────────────

  async updateBoard({ params, request, response }: HttpContext) {
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
    return response.redirect().back()
  }

  async uploadBoardImage({ params, request, response, session }: HttpContext) {
    const board = await Board.findOrFail(params.id)

    const imageUrl = await storeImage(request)
    if (!imageUrl) {
      session.flash('inputErrorsBag', { image: 'Please choose a valid image under 20MB.' })
      return response.redirect().back()
    }

    board.imageUrl = imageUrl
    await board.save()

    session.flash('created', { imageUrl })
    return response.redirect().back()
  }
}
