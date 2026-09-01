import transmit from '@adonisjs/transmit/services/main'

/**
 * Who may listen to a board's change notifications.
 *
 * Signed-in admins only. Students reach a board through a public share link and
 * read it without an account; giving each of them a live connection would mean
 * a class of thirty holding thirty open streams per board, to deliver updates
 * nobody asked for. They keep the existing behaviour — the board they loaded
 * stays as it was until they refresh.
 *
 * The callback runs during POST __transmit/subscribe, which is an ordinary
 * router request, so `silent_auth_middleware` has already resolved the web
 * guard by this point. Returning false makes Transmit answer 403; that is why
 * the subscribe route deliberately carries no `admin` middleware, which would
 * redirect an HTML response at a client expecting a status code.
 */
transmit.authorize<{ id: string }>('boards/:id', (ctx) => {
  return ctx.auth.use('web').user?.isAdmin === true
})
