import * as Y from 'yjs'
import logger from '@adonisjs/core/services/logger'
import { parseDocumentName, renderDocument, seedDocument } from '#helpers/collab_documents'
import { verifyCollabTicket } from '#helpers/collab_auth'
import { loadContent, loadState, storeContent, storeState } from '#services/collab_service'
import { broadcastBoardChangedById } from '#services/board_broadcast'
import { boardIdForCard } from '#services/board_writes'

/**
 * What the collaboration socket does on connect, load and save.
 *
 * Split out from the provider so the provider stays about wiring a WebSocket to
 * the HTTP server, and this stays about documents.
 */
export function collaborationHooks() {
  return {
    /**
     * Every connection must present a ticket from an authenticated route, and
     * name a document that actually exists in our scheme.
     *
     * This is the only gate on the socket: the upgrade never touches the
     * router, so none of the usual middleware — silent_auth, the admin guard,
     * CSRF — has run by the time we get here. Throwing rejects the connection.
     */
    async onAuthenticate(data: { token: string; documentName: string }) {
      const ticket = verifyCollabTicket(data.token)
      if (!ticket) throw new Error('Unauthorized')

      if (!parseDocumentName(data.documentName)) throw new Error('Unknown document')

      return { user: ticket }
    },

    /**
     * Hands back the document as it stands.
     *
     * A room with saved Yjs state resumes from it. One that has never been
     * edited collaboratively is seeded from the HTML already in the row, so
     * turning on collaborative editing does not appear to wipe what was there.
     */
    async onLoadDocument(data: { documentName: string; document: Y.Doc }) {
      const ref = parseDocumentName(data.documentName)
      if (!ref) throw new Error('Unknown document')

      const state = await loadState(data.documentName)
      if (state) {
        Y.applyUpdate(data.document, state)
        return data.document
      }

      seedDocument(data.document, await loadContent(ref))
      return data.document
    },

    /**
     * Persists both halves: the Yjs state that keeps editing working, and the
     * HTML that everything else in the app reads.
     *
     * Hocuspocus debounces this, so it runs on a pause in typing rather than
     * per keystroke. Failures are logged rather than thrown — an exception here
     * would tear down a live editing session, and losing the save is the
     * smaller harm than losing the connection.
     */
    async onStoreDocument(data: { documentName: string; document: Y.Doc }) {
      const ref = parseDocumentName(data.documentName)
      if (!ref) return

      try {
        await storeState(data.documentName, Y.encodeStateAsUpdate(data.document))
        await storeContent(ref, renderDocument(data.document))

        /**
         * Tell everyone else on the board, so a card's description updates for
         * people who are looking at it but not editing it.
         */
        const boardId = ref.kind === 'board' ? ref.id : await boardIdForCard(ref.id)
        broadcastBoardChangedById(boardId)
      } catch (error) {
        logger.error({ err: error, document: data.documentName }, 'collab: failed to store document')
      }
    },
  }
}
