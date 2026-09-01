import { mkdirSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import Board from '#models/board'
import Card from '#models/card'
import CardAttachment from '#models/card_attachment'
import { findBoardForDisplay } from '#services/board_service'
import * as writes from '#services/board_writes'
import { broadcastBoardChanged } from '#services/board_broadcast'
import { mirrorRemoteImage } from '#services/remote_file_service'
import { UPLOADS_DIR } from '#helpers/uploads'
import { ATTACHMENT_EXTNAMES, ATTACHMENT_MAX_SIZE, mimeTypeFor } from '#helpers/attachments'

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
 * Resolves whatever the form supplied into a stored image path.
 *
 * A pasted URL is downloaded and kept locally so the board does not break when
 * the original link rots. If that fetch is refused or fails the URL is stored
 * as-is, so adding an image never hard-fails on an unreachable host.
 */
async function resolveImageInput(
  request: HttpContext['request'],
  imageUrl?: string | null
): Promise<string | null> {
  const uploaded = await storeImage(request)
  if (uploaded) return uploaded

  const url = imageUrl?.trim()
  if (!url) return null
  if (url.startsWith('/uploads/')) return url

  return (await mirrorRemoteImage(url)) ?? url
}

/**
 * Runs a board write, turning a lost race into something the editor can read.
 *
 * Two admins on one board work from snapshots that go stale without warning,
 * so a save can land on a card someone else just deleted or just edited. None
 * of that is exceptional — it is ordinary co-editing — so it comes back as a
 * flash message on the board the user is already looking at, rather than a
 * stack trace or an error page that loses their place. The redirect also hands
 * back fresh props, so the stale snapshot that caused the conflict is replaced
 * in the same round trip.
 */
async function guarded(
  ctx: HttpContext,
  run: () => Promise<unknown>
): Promise<{ ok: true; result: unknown } | { ok: false }> {
  try {
    return { ok: true, result: await run() }
  } catch (error) {
    if (
      error instanceof writes.MissingTargetError ||
      error instanceof writes.StaleWriteError ||
      error instanceof writes.WriteRejectedError
    ) {
      ctx.session.flash('conflict', error.message)
      return { ok: false }
    }
    throw error
  }
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

    const board = await Board.create({
      title: title.trim(),
      description: description?.trim() || null,
      imageUrl: await resolveImageInput(request, imageUrl),
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

  /**
   * The client's `position` is ignored here and everywhere below: it is derived
   * from a snapshot that another editor may already have invalidated, and two
   * users adding to the same container would both claim the same slot. The
   * database picks the next free one instead.
   */
  async storeColumn(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const { boardId, title } = request.only(['boardId', 'title', 'position'])

    const outcome = await guarded(ctx, () =>
      writes.createColumn(Number(boardId), { title }, auth.user?.id ?? null)
    )
    if (outcome.ok) {
      session.flash('created', { id: (outcome.result as { id: number }).id })
      broadcastBoardChanged(ctx, Number(boardId))
    }
    return response.redirect().back()
  }

  async updateColumn(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const outcome = await guarded(ctx, () =>
      writes.renameColumn(params.id, request.input('title'), auth.user?.id ?? null)
    )
    if (outcome.ok) broadcastBoardChanged(ctx, await writes.boardIdForColumn(params.id))
    return response.redirect().back()
  }

  async destroyColumn(ctx: HttpContext) {
    const { params, auth, response } = ctx
    // Resolved first: after the delete there is no row left to walk up from.
    const boardId = await writes.boardIdForColumn(params.id)
    const outcome = await guarded(ctx, () => writes.deleteColumn(params.id, auth.user?.id ?? null))
    if (outcome.ok) broadcastBoardChanged(ctx, boardId)
    return response.redirect().back()
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  async storeGroup(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const { columnId, title } = request.only(['columnId', 'title', 'position'])

    const outcome = await guarded(ctx, () =>
      writes.createGroup(Number(columnId), { title }, auth.user?.id ?? null)
    )
    if (outcome.ok) {
      session.flash('created', { id: (outcome.result as { id: number }).id })
      broadcastBoardChanged(ctx, await writes.boardIdForColumn(Number(columnId)))
    }
    return response.redirect().back()
  }

  async updateGroup(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const outcome = await guarded(ctx, () =>
      writes.renameGroup(params.id, request.input('title'), auth.user?.id ?? null)
    )
    if (outcome.ok) broadcastBoardChanged(ctx, await writes.boardIdForGroup(params.id))
    return response.redirect().back()
  }

  async destroyGroup(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const boardId = await writes.boardIdForGroup(params.id)
    const outcome = await guarded(ctx, () => writes.deleteGroup(params.id, auth.user?.id ?? null))
    if (outcome.ok) broadcastBoardChanged(ctx, boardId)
    return response.redirect().back()
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  async storeCard(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const attrs = request.only([
      'groupId',
      'columnId',
      'title',
      'description',
      'imageUrl',
      'linkUrl',
      'linkTitle',
      'youtubeUrl',
    ])

    const outcome = await guarded(ctx, () => writes.createCard(attrs, auth.user?.id ?? null))

    // The board page opens the editor on the card it just created.
    if (outcome.ok) {
      const card = outcome.result as { id: number }
      session.flash('created', { id: card.id })
      broadcastBoardChanged(ctx, await writes.boardIdForCard(card.id))
    }
    return response.redirect().back()
  }

  /**
   * The editor sends the version it opened the card at. If another admin saved
   * in the meantime the write is refused rather than applied on top of theirs,
   * and the redirect brings back their copy — the alternative is that whoever
   * clicks Save last silently erases the other's edit.
   */
  async updateCard(ctx: HttpContext) {
    const { params, request, auth, response } = ctx

    /**
     * A pasted image URL is mirrored locally so the card keeps working after
     * the source link disappears. Already-local paths are left alone.
     */
    const submittedImage = request.input('imageUrl')
    const resolvedImage =
      typeof submittedImage === 'string' &&
      submittedImage &&
      !submittedImage.startsWith('/uploads/')
        ? ((await mirrorRemoteImage(submittedImage)) ?? submittedImage)
        : submittedImage

    const attrs = {
      ...request.only(['title', 'description', 'linkUrl', 'linkTitle', 'youtubeUrl']),
      ...(submittedImage !== undefined ? { imageUrl: resolvedImage } : {}),
      ...(request.input('groupId') !== undefined ? { groupId: request.input('groupId') } : {}),
      ...(request.input('columnId') !== undefined ? { columnId: request.input('columnId') } : {}),
    }

    const expected = Number(request.input('version'))
    const outcome = await guarded(ctx, () =>
      writes.updateCard(params.id, attrs, auth.user?.id ?? null, expected || null)
    )
    if (outcome.ok) broadcastBoardChanged(ctx, await writes.boardIdForCard(params.id))
    return response.redirect().back()
  }

  async destroyCard(ctx: HttpContext) {
    const { params, auth, response } = ctx
    // A card delete is soft, so the row survives and can still be walked up.
    const outcome = await guarded(ctx, () =>
      writes.softDeleteCard(params.id, auth.user?.id ?? null)
    )
    if (outcome.ok) broadcastBoardChanged(ctx, await writes.boardIdForCard(params.id))
    return response.redirect().back()
  }

  async reorderCards(ctx: HttpContext) {
    const { request, auth, response } = ctx
    const ids = request.input('ids')
    const clean = Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id)) : []
    if (!clean.length) return response.redirect().back()

    const outcome = await guarded(ctx, () => writes.reorderCards(clean, auth.user?.id ?? null))
    if (outcome.ok) broadcastBoardChanged(ctx, await writes.boardIdForCard(clean[0]))
    return response.redirect().back()
  }

  async uploadCardImage(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    await Card.findOrFail(params.id)

    const imageUrl = await storeImage(request)
    if (!imageUrl) {
      session.flash('inputErrorsBag', { image: 'Please choose a valid image under 20MB.' })
      return response.redirect().back()
    }

    // The card editor previews the stored file straight away.
    session.flash('created', { imageUrl })
    broadcastBoardChanged(ctx, await writes.boardIdForCard(params.id))
    return response.redirect().back()
  }

  // ── Board metadata ─────────────────────────────────────────────────────────

  async updateBoard(ctx: HttpContext) {
    const { params, request, response } = ctx
    const board = await Board.findOrFail(params.id)
    const { title, imageUrl, description, references } = request.only([
      'title',
      'imageUrl',
      'description',
      'references',
    ])

    if (typeof title === 'string' && title.trim()) board.title = title.trim()
    if (typeof imageUrl === 'string') {
      board.imageUrl = imageUrl ? await resolveImageInput(request, imageUrl) : null
    }
    if (typeof description === 'string') board.description = description.trim() || null
    if (Array.isArray(references)) {
      board.references = (references as unknown[]).filter(
        (r): r is string => typeof r === 'string' && r.trim() !== ''
      )
    }

    await board.save()
    broadcastBoardChanged(ctx, board.id)
    return response.redirect().back()
  }

  async uploadBoardImage(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const board = await Board.findOrFail(params.id)

    const imageUrl = await storeImage(request)
    if (!imageUrl) {
      session.flash('inputErrorsBag', { image: 'Please choose a valid image under 20MB.' })
      return response.redirect().back()
    }

    board.imageUrl = imageUrl
    await board.save()

    session.flash('created', { imageUrl })
    broadcastBoardChanged(ctx, board.id)
    return response.redirect().back()
  }

  // ── Card attachments ───────────────────────────────────────────────────────

  /**
   * POST /cards/:id/attachments
   *
   * Documents attached to a card. The stored filename is prefixed with a
   * timestamp to avoid collisions, while the original name is kept separately
   * for display and download.
   */
  async storeCardAttachment(ctx: HttpContext) {
    const { params, request, auth, response, session } = ctx
    const card = await Card.findOrFail(params.id)

    const file = request.file('file', {
      size: ATTACHMENT_MAX_SIZE,
      extnames: [...ATTACHMENT_EXTNAMES],
    })

    if (!file) {
      session.flash('inputErrorsBag', { file: 'Please choose a file to attach.' })
      return response.redirect().back()
    }
    if (!file.isValid) {
      session.flash('inputErrorsBag', {
        file:
          file.errors[0]?.message ??
          `Allowed types: ${ATTACHMENT_EXTNAMES.join(', ')} (max ${ATTACHMENT_MAX_SIZE}).`,
      })
      return response.redirect().back()
    }

    const originalName = file.clientName ?? 'attachment'
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storedName = `${Date.now()}-${safeName}`

    mkdirSync(UPLOADS_DIR, { recursive: true })
    await file.move(UPLOADS_DIR, { name: storedName, overwrite: true })

    const count = await CardAttachment.query().where('card_id', card.id).count('* as total')

    const attachment = await CardAttachment.create({
      cardId: card.id,
      fileUrl: `/uploads/${storedName}`,
      fileName: originalName,
      mimeType: mimeTypeFor(`.${file.extname ?? ''}`),
      sizeBytes: file.size ?? null,
      position: Number(count[0].$extras.total),
      createdBy: auth.user?.id ?? null,
    })

    session.flash('created', { id: attachment.id })
    broadcastBoardChanged(ctx, await writes.boardIdForCard(card.id))
    return response.redirect().back()
  }

  /**
   * DELETE /cards/attachments/:id
   *
   * Removes the database row. The file itself is left on disk: another card
   * could reference the same upload, and orphaned files are harmless.
   */
  async destroyCardAttachment(ctx: HttpContext) {
    const { params, response } = ctx
    const attachment = await CardAttachment.findOrFail(params.id)
    // Resolved before the delete: the row is the only link back to the board.
    const boardId = await writes.boardIdForCard(attachment.cardId)
    await attachment.delete()
    broadcastBoardChanged(ctx, boardId)
    return response.redirect().back()
  }
}
