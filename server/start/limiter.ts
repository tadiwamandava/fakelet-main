/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| Throttle middleware applied to routes to slow brute-force / credential-
| stuffing attacks. Keyed by client IP by default.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/**
 * Auth endpoints (login, signup, forgot/reset password): 10 requests per
 * minute per IP, then blocked for 10 minutes. Enough for genuine retries,
 * far too slow to brute-force a password or a 6-digit reset code.
 */
export const authThrottle = limiter.define('auth', () => {
  return limiter.allowRequests(10).every('1 minute').blockFor('10 minutes')
})
