import db from '@adonisjs/lucid/services/db'
import Board from '#models/board'
import Card from '#models/card'
import type { DocumentRef } from '#helpers/collab_documents'
import { plainTextToRichText, sanitizeRichText } from '#helpers/rich_text'

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
 * The HTML a document already holds, for seeding a Y.Doc the first time.
 *
 * Descriptions written before this feature are bare text whose line breaks came
 * from CSS, so they are converted on the way in — otherwise they would collapse
 * into one run-on paragraph the moment they became a rich-text document.
 */
export async function loadContent(ref: DocumentRef): Promise<string> {
  if (ref.kind === 'card') {
    const card = await Card.query().where('id', ref.id).where('is_deleted', false).first()
    if (!card?.description) return ''

    return /<[a-z][\s\S]*>/i.test(card.description)
      ? card.description
      : plainTextToRichText(card.description)
  }

  const board = await Board.find(ref.id)
  return board?.document ?? ''
}

/**
 * Writes the rendered document back to the row the rest of the app reads.
 *
 * Sanitised here rather than trusted: this HTML is about to be served to
 * students on a public board, and an editor is not the only thing that can put
 * content into a Y.Doc.
 */
export async function storeContent(ref: DocumentRef, html: string): Promise<void> {
  const clean = sanitizeRichText(html)
  const table = ref.kind === 'card' ? 'cards' : 'boards'
  const column = ref.kind === 'card' ? 'description' : 'document'

  await db.from(table).where('id', ref.id).update({ [column]: clean, updated_at: new Date() })
}

