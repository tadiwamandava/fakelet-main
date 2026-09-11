import type { ApplicationService } from '@adonisjs/core/types'
import type { Server as NodeHttpServer } from 'node:http'

/**
 * The collaborative editing socket, sharing the application's HTTP server.
 *
 * Hocuspocus is what merges two people typing at once. It needs a WebSocket,
 * which AdonisJS's router does not speak, so it is attached to the same Node
 * server's `upgrade` event instead of run as a second process. That keeps the
 * "one deployable" property the rest of the app is built around — the same
 * reason SSE went in-process rather than onto its own service.
 *
 * DEPLOYMENT INVARIANT, and it is the same one config/transmit.ts carries:
 * this holds documents in memory on one process. Under PM2 cluster mode, or
 * behind more than one instance, two people editing the same card would land on
 * different processes and silently diverge — each saving over the other. Adding
 * instances means giving Hocuspocus a shared Redis extension in the same change.
 */
export const COLLAB_PATH = '/collab'

export default class CollabProvider {
  constructor(protected app: ApplicationService) {}

  /** Kept so shutdown can close connections rather than drop them. */
  #close: (() => Promise<void>) | null = null

  async ready() {
    /**
     * Only the HTTP process serves sockets. Ace commands and the REPL boot the
     * same providers, and starting a WebSocket server in `node ace migration:run`
     * would hold the process open after the command finished.
     */
    if (this.app.getEnvironment() !== 'web') return

    const server = await this.app.container.make('server')
    const node = server.getNodeServer() as NodeHttpServer | undefined
    if (!node) return

    const [{ Hocuspocus }, crossws, hooks] = await Promise.all([
      import('@hocuspocus/server'),
      import('crossws/adapters/node'),
      import('#services/collab_hooks'),
    ])

    /**
     * Hocuspocus directly rather than its Server wrapper: the wrapper opens an
     * HTTP listener of its own, and the point here is to share the one the
     * application already has.
     */
    const hocuspocus = new Hocuspocus(hooks.collaborationHooks())

    /**
     * Hocuspocus 4 speaks crossws rather than `ws`, and `handleConnection` only
     * registers a connection — it attaches no listeners of its own. The pump
     * below is what actually feeds it. Without it a socket upgrades cleanly and
     * then sits silent, never authenticating and never syncing, which is a
     * confusing way to fail. This mirrors what Hocuspocus's own Server does.
     */
    const sockets = crossws.default({
      hooks: {
        open: (peer: any) => {
          peer._hocuspocus = hocuspocus.handleConnection(peer.websocket, peer.request)
        },
        message: (peer: any, message: any) => {
          peer._hocuspocus?.handleMessage(message.uint8Array())
        },
        close: (peer: any, event: any) => {
          peer._hocuspocus?.handleClose({ code: event?.code, reason: event?.reason })
        },
      },
    })

    node.on('upgrade', (request, socket, head) => {
      /**
       * Only claim our own path. Vite's dev server runs its hot-reload channel
       * over a WebSocket on this same port, so answering every upgrade would
       * break reloading in development.
       */
      const path = (request.url ?? '').split('?')[0]
      if (path !== COLLAB_PATH) return

      sockets.handleUpgrade(request as any, socket as any, head)
    })

    this.#close = async () => {
      hocuspocus.flushPendingStores()
      hocuspocus.closeConnections()
      sockets.close()
    }
  }

  /**
   * Flushes documents on the way down.
   *
   * Hocuspocus debounces writes, so a document edited in the last couple of
   * seconds exists only in memory when a deploy restarts the process. Flushing
   * first means a redeploy costs at most a keystroke rather than the last few
   * seconds of someone's paragraph.
   */
  async shutdown() {
    await this.#close?.()
    this.#close = null
  }
}
