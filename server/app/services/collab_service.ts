import db from '@adonisjs/lucid/services/db'
import Board from '#models/board'
import Card from '#models/card'
import type { DocumentRef } from '#helpers/collab_documents'
import type { RichDocument } from '#helpers/rich_text'

/**
 * Where a collaborative document lives between sessions.
 *
 * Each one is persisted twice, on purpose. The Yjs state is what lets two
 * people type at once; the rendered HTML is what the public board, the token
 * API, search and the card previews actually read, none of which understand a
 * CRDT. The HTML is derived from the state on the server rather than sent up by
 * the client, so it cannot fall behind when the last editor closes their laptop
 * mid-sentence.
 */

/** The Yjs state for a room, or null the first time it is opened. */
export async function loadState(name: string): Promise<Uint8Array | null> {
  const row = await db.from('collab_documents').where('name', name).select('state').first()
  if (!row?.state) return null

  return new Uint8Array(row.state)
}

export async function storeState(name: string, state: Uint8Array): Promise<void> {
  await db
    .table('collab_documents')
    .insert({ name, state: Buffer.from(state), updated_at: new Date() })
    .onConflict('name')
    .merge(['state', 'updated_at'])
}

/**
 * What a document already holds, for seeding a Y.Doc the first time.
 *
 * Both models `consume` this column, so a row still holding plain text from
 * before this feature arrives here already shaped as a document — the tolerance
 * lives in the model rather than being repeated at every reader.
 */
export async function loadContent(ref: DocumentRef): Promise<RichDocument | null> {
  if (ref.kind === 'card') {
    const card = await Card.query().where('id', ref.id).where('is_deleted', false).first()
    return card?.description ?? null
  }

  const board = await Board.find(ref.id)
  return board?.document ?? null
}

/**
 * Writes the document back to the row the rest of the app reads.
 *
 * Goes through the model deliberately. The raw query builder would bypass the
 * column's `prepare` hook, and the symptom would be an object stringified by
 * the driver's own rules landing in a text column — the write would appear to
 * succeed and the row would be unreadable.
 */
export async function storeContent(ref: DocumentRef, content: RichDocument): Promise<void> {
  if (ref.kind === 'card') {
    const card = await Card.find(ref.id)
    if (!card) return

    card.description = content
    await card.save()
    return
  }

  const board = await Board.find(ref.id)
  if (!board) return

  board.document = content
  await board.save()
}

