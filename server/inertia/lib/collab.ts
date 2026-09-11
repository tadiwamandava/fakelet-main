import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

/**
 * The connection behind a collaborative editor.
 *
 * One socket per document, opened when an editor mounts and closed when it
 * unmounts — a card editor is a modal, so holding connections open for cards
 * nobody is looking at would be pure cost.
 */

export type CollabIdentity = { name: string; color: string }

/**
 * A ticket for the socket, fetched from an authenticated route.
 *
 * The upgrade never reaches the router, so the session cookie cannot authorise
 * it. Cached for the page's lifetime: the ticket lasts five minutes and is only
 * read at handshake time, so refetching per editor would be wasted requests.
 */
let ticket: Promise<{ token: string; name: string; color: string }> | null = null

function getTicket() {
  ticket ??= fetch('/collab/ticket', {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  }).then((r) => {
    if (!r.ok) throw new Error(`collab ticket: ${r.status}`)
    return r.json()
  })

  return ticket
}

export type CollabSession = {
  doc: Y.Doc
  provider: HocuspocusProvider
  identity: CollabIdentity
}

/**
 * Opens a document and keeps it open while the component is mounted.
 *
 * Returns null until the socket is ready, which is the editor's cue to stay
 * read-only: binding Tiptap to a document that has not synced yet shows an
 * empty box and then floods it with content, and anything typed in between is
 * merged in at the wrong place.
 */
export function useCollabDocument(name: string | null, enabled: boolean): CollabSession | null {
  const [session, setSession] = useState<CollabSession | null>(null)

  useEffect(() => {
    if (!name || !enabled) return

    let cancelled = false
    let provider: HocuspocusProvider | null = null

    getTicket()
      .then((pass) => {
        if (cancelled) return

        const doc = new Y.Doc()
        const url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collab`

        provider = new HocuspocusProvider({
          url,
          name,
          token: pass.token,
          document: doc,
          /**
           * Only surfaced once the document has synced, so the editor never
           * binds to a half-loaded document.
           */
          onSynced: () => {
            if (!cancelled) {
              setSession({ doc, provider: provider!, identity: { name: pass.name, color: pass.color } })
            }
          },
        })
      })
      .catch(() => {
        /**
         * A document that cannot connect falls back to read-only rather than
         * failing loudly. Losing collaboration is worth a degraded editor, not
         * a broken page.
         */
        ticket = null
      })

    return () => {
      cancelled = true
      setSession(null)
      provider?.destroy()
    }
  }, [name, enabled])

  return session
}
