import encryption from '@adonisjs/core/services/encryption'

/**
 * Proving who is on the other end of a WebSocket.
 *
 * The socket cannot use the session cookie the way an HTTP route does: the
 * upgrade bypasses the router, and with it silent_auth, the guards and CSRF. So
 * the browser first asks an ordinary authenticated route for a short-lived
 * ticket and hands that to the socket instead.
 *
 * Signed with APP_KEY through the framework's own encryption service, so there
 * is no second secret to manage or rotate. Five minutes is ample to open a
 * connection and useless to anyone who finds it later — the ticket authorises
 * the handshake, not the session.
 */
const TICKET_PURPOSE = 'collab-socket'
const TICKET_LIFETIME = '5 mins'

export type CollabTicket = {
  userId: number
  /** Shown beside another person's caret. */
  name: string
}

export function issueCollabTicket(ticket: CollabTicket): string {
  return encryption.encrypt(ticket, TICKET_LIFETIME, TICKET_PURPOSE)
}

/** Returns null for anything expired, tampered with, or signed for another use. */
export function verifyCollabTicket(token: unknown): CollabTicket | null {
  if (typeof token !== 'string' || !token) return null

  const payload = encryption.decrypt<CollabTicket>(token, TICKET_PURPOSE)
  if (!payload || typeof payload.userId !== 'number' || typeof payload.name !== 'string') {
    return null
  }

  return payload
}
