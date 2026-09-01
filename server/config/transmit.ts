import { defineConfig } from '@adonisjs/transmit'

/**
 * Server-Sent Events, used to tell admins already looking at a board that
 * someone else has changed it.
 *
 * DEPLOYMENT INVARIANT: `transport: null` broadcasts within a single process.
 * If this app is ever run under PM2 cluster mode, or behind more than one
 * instance, an admin connected to instance A will never see a write served by
 * instance B — and nothing will report an error. Adding instances therefore
 * means adding a Redis transport here in the same change.
 *
 * The reverse proxy must also leave `text/event-stream` unbuffered and
 * uncompressed, or the stream stalls. See the README's deployment notes.
 */
export default defineConfig({
  /**
   * Keep-alive comments. Idle proxies and load balancers commonly close a
   * connection that has been silent for a minute, so the stream is kept warm
   * rather than relying on the client to notice and reconnect.
   */
  pingInterval: '30s',

  transport: null,
})
