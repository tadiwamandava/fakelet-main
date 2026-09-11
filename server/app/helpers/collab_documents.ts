import * as Y from 'yjs'
import { generateHTML, generateJSON } from '@tiptap/html'
import { getSchema } from '@tiptap/core'
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from 'y-prosemirror'
import { editorExtensions, EDITOR_FIELD } from '#shared/editor_schema'

/**
 * Turning a Y.Doc into HTML and back.
 *
 * Deliberately free of any database import: this is the part of collaborative
 * editing most worth testing on its own, and requiring a booted application to
 * exercise a pure conversion would make that awkward. Persistence lives in
 * #services/collab_service.
 */

/** A room the socket will accept, and which row its HTML belongs to. */
export type DocumentRef = { kind: 'card'; id: number } | { kind: 'board'; id: number }

/**
 * Parses a room name.
 *
 * Rooms are named by the client, so this is a validation boundary rather than a
 * convenience: anything that is not exactly `card:<id>` or `board:<id>` is
 * refused instead of being opened as a new empty document.
 */
export function parseDocumentName(name: string): DocumentRef | null {
  const match = /^(card|board):(\d+)$/.exec(name)
  if (!match) return null

  const id = Number(match[2])
  if (!Number.isSafeInteger(id) || id <= 0) return null

  return { kind: match[1] as 'card' | 'board', id }
}

export function documentName(ref: DocumentRef): string {
  return `${ref.kind}:${ref.id}`
}

/** Renders a document's body to HTML, ready for sanitising and storage. */
export function renderDocument(doc: Y.Doc): string {
  return generateHTML(yXmlFragmentToProsemirrorJSON(doc.getXmlFragment(EDITOR_FIELD)), editorExtensions)
}

/**
 * Seeds a fresh Y.Doc from stored HTML, so the first person to open a document
 * sees the content that was already there.
 *
 * Only ever runs on a document with no Yjs state yet. Seeding one that already
 * has state would append the content rather than replace it, because a CRDT
 * merges rather than overwrites.
 */
export function seedDocument(doc: Y.Doc, html: string): void {
  if (!html.trim()) return

  const fragment = doc.getXmlFragment(EDITOR_FIELD)
  if (fragment.length > 0) return

  prosemirrorJSONToYXmlFragment(
    getSchema(editorExtensions),
    generateJSON(html, editorExtensions),
    fragment
  )
}
