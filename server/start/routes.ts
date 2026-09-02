/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
| SECURITY INVARIANT: every route under /api/v1 is pinned to the 'api' (token)
| guard, because that surface is exempt from CSRF. Do not add the 'web' guard
| to an /api/v1 route — a CSRF-exempt route that accepts cookie auth is a CSRF
| hole. See #helpers/api_surface for the full explanation.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import { controllers } from '#generated/controllers'
import { authThrottle } from '#start/limiter'

const BoardsController = () => import('#controllers/boards_controller')
const ColumnsController = () => import('#controllers/columns_controller')
const GroupsController = () => import('#controllers/groups_controller')
const CardsController = () => import('#controllers/cards_controller')
const BookmarksController = () => import('#controllers/bookmarks_controller')
const PasswordResetsController = () => import('#controllers/password_resets_controller')
const InvitationsController = () => import('#controllers/invitations_controller')
const AdminController = () => import('#controllers/admin_controller')
const AuthPagesController = () => import('#controllers/auth_pages_controller')
const BoardPagesController = () => import('#controllers/board_pages_controller')
const AdminPagesController = () => import('#controllers/admin_pages_controller')

// Serve uploaded files (outside /api/v1 so img src="/uploads/..." works)
router.get('/uploads/:filename', [BoardsController, 'serveUpload'])

/**
 * Live board updates: GET __transmit/events (the SSE stream) plus the subscribe
 * and unsubscribe endpoints. Who may listen is decided in #start/transmit.
 *
 * These sit outside /api/v1, so CSRF applies to the two POST routes and the
 * client sends X-XSRF-TOKEN with them. That is correct and must stay: the
 * exemption list in config/shield.ts is only for token-authenticated routes,
 * and subscribing authorises off the session cookie. See #helpers/api_surface.
 */
transmit.registerRoutes()

/*
|--------------------------------------------------------------------------
| Web (Inertia) routes — session guard, CSRF enforced
|--------------------------------------------------------------------------
*/
router.get('/', ({ response }) => response.redirect('/boards'))

// Page views are not throttled — reloading the sign-in page must never lock
// someone out.
router.get('/login', [AuthPagesController, 'showLogin']).as('login')
router.get('/signup', [AuthPagesController, 'showSignup']).as('signup')

router
  .group(() => {
    router.post('/login', [AuthPagesController, 'login'])
    router.post('/signup', [AuthPagesController, 'signup'])
    router.post('/forgot-password', [AuthPagesController, 'forgotPassword'])
    router.post('/reset-password', [AuthPagesController, 'resetPassword'])
  })
  // Same limiter the token API uses, to slow credential stuffing and
  // brute-forcing of the 6-digit reset code.
  .use(authThrottle)

router
  .post('/logout', [AuthPagesController, 'logout'])
  .use(middleware.auth({ guards: ['web'] }))

/**
 * A shared board link must open for a signed-out visitor, so this route has no
 * auth middleware — exactly like GET /api/v1/boards/:id.
 */
// Named distinctly from the API's auto-generated "boards.show"
router.get('/boards/:id', [BoardPagesController, 'show']).as('web.boards.show')

// Board list and editing — admin only
router
  .group(() => {
    router.get('/boards', [BoardPagesController, 'index']).as('web.boards.index')
    router.post('/boards', [BoardPagesController, 'storeBoard'])
    router.delete('/boards/:id', [BoardPagesController, 'destroyBoard'])
    router.put('/boards/:id', [BoardPagesController, 'updateBoard'])
    router.post('/boards/:id/image', [BoardPagesController, 'uploadBoardImage'])

    router.post('/columns', [BoardPagesController, 'storeColumn'])
    // Before /columns/:id so "reorder" is not read as an id.
    router.post('/columns/reorder', [BoardPagesController, 'reorderColumns'])
    router.put('/columns/:id', [BoardPagesController, 'updateColumn'])
    router.delete('/columns/:id', [BoardPagesController, 'destroyColumn'])

    router.post('/groups', [BoardPagesController, 'storeGroup'])
    router.post('/groups/reorder', [BoardPagesController, 'reorderGroups'])
    router.put('/groups/:id', [BoardPagesController, 'updateGroup'])
    router.delete('/groups/:id', [BoardPagesController, 'destroyGroup'])

    router.post('/cards', [BoardPagesController, 'storeCard'])
    router.post('/cards/reorder', [BoardPagesController, 'reorderCards'])
    router.put('/cards/:id', [BoardPagesController, 'updateCard'])
    router.delete('/cards/:id', [BoardPagesController, 'destroyCard'])
    router.post('/cards/:id/image', [BoardPagesController, 'uploadCardImage'])
    router.post('/cards/:id/attachments', [BoardPagesController, 'storeCardAttachment'])
    router.delete('/cards/attachments/:id', [BoardPagesController, 'destroyCardAttachment'])

    router.get('/admin', [AdminPagesController, 'index']).as('web.admin.index')
    // Any admin may invite. A redeemed invitation only ever creates an ordinary
    // admin, so this grows the admin list without reaching master.
    router.post('/admin/invitations', [AdminPagesController, 'storeInvitation'])
  })
  .use(middleware.admin({ guards: ['web'] }))

/**
 * Access control — master admins only.
 *
 * These are every route that can revoke someone's access or hand out master,
 * kept together so it stays obvious what the tier is for. The same four are
 * mirrored on /api/v1 below; both call the same service, so neither is a way
 * around the other.
 */
router
  .group(() => {
    router.delete('/admin/invitations/:id', [AdminPagesController, 'destroyInvitation'])
    router.delete('/admin/users/:id', [AdminPagesController, 'destroyUser'])
    router.patch('/admin/users/:id/admin', [AdminPagesController, 'toggleAdmin'])
    router.patch('/admin/users/:id/master', [AdminPagesController, 'toggleMaster'])
    router.post('/admin/users/:id/sign-out', [AdminPagesController, 'signOutUser'])
    router.post('/admin/users/:id/password', [AdminPagesController, 'setUserPassword'])

    // Recycle bin — deleted content is a master's to restore or destroy.
    router.get('/boards/:id/archive', [BoardPagesController, 'archive']).as('web.boards.archive')
    router.post('/cards/:id/restore', [BoardPagesController, 'restoreCard'])
    router.delete('/cards/:id/purge', [BoardPagesController, 'purgeCard'])
  })
  .use(middleware.admin({ guards: ['web'], master: true }))

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
        router.post('forgot-password', [PasswordResetsController, 'requestCode'])
        router.post('reset-password', [PasswordResetsController, 'resetPassword'])
      })
      .prefix('auth')
      .as('auth')
      .use(authThrottle)

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth({ guards: ['api'] }))

    router
      .group(() => {
        router.get('/bookmarks', [BookmarksController, 'index'])
        router.post('/bookmarks/toggle', [BookmarksController, 'toggle'])
      })
      .use(middleware.auth({ guards: ['api'] }))

    router
      .group(() => {
        router.get('/invitations', [InvitationsController, 'index'])
        router.post('/invitations', [InvitationsController, 'store'])
        router.get('/admin/users', [AdminController, 'users'])
      })
      .use(middleware.admin({ guards: ['api'] }))

    // Access control — master only, mirroring the dashboard routes above.
    router
      .group(() => {
        router.delete('/invitations/:id', [InvitationsController, 'destroy'])
        router.delete('/admin/users/:id', [AdminController, 'deleteUser'])
        router.patch('/admin/users/:id/admin', [AdminController, 'toggleAdmin'])
        router.patch('/admin/users/:id/master', [AdminController, 'toggleMaster'])
        router.post('/admin/users/:id/sign-out', [AdminController, 'signOutUser'])
        router.post('/admin/users/:id/password', [AdminController, 'setUserPassword'])
      })
      .use(middleware.admin({ guards: ['api'], master: true }))

    // Board list is admin-only; a single board stays public for shared links
    router.get('/boards', [BoardsController, 'index']).use(middleware.auth({ guards: ['api'] }))
    router.get('/boards/:id', [BoardsController, 'show'])

    // Admin-only routes — the admin middleware authenticates AND requires isAdmin
    router
      .group(() => {
        router.post('/boards', [BoardsController, 'store'])
        router.put('/boards/:id', [BoardsController, 'update'])
        router.delete('/boards/:id', [BoardsController, 'destroy'])
        router.post('/boards/:id/image', [BoardsController, 'uploadImage'])

        router.post('/columns', [ColumnsController, 'store'])
        router.put('/columns/:id', [ColumnsController, 'update'])
        router.delete('/columns/:id', [ColumnsController, 'destroy'])

        router.post('/groups', [GroupsController, 'store'])
        router.put('/groups/:id', [GroupsController, 'update'])
        router.delete('/groups/:id', [GroupsController, 'destroy'])

        router.post('/cards', [CardsController, 'store'])
        router.post('/cards/reorder', [CardsController, 'reorder'])
        router.put('/cards/:id', [CardsController, 'update'])
        router.delete('/cards/:id', [CardsController, 'destroy'])
        router.post('/cards/:id/image', [CardsController, 'uploadImage'])
      })
      .use(middleware.admin({ guards: ['api'] }))
  })
  .prefix('/api/v1')
