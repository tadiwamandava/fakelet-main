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

// Serve uploaded files (outside /api/v1 so img src="/uploads/..." works)
router.get('/uploads/:filename', [BoardsController, 'serveUpload'])

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

// Board editing — admin only
router
  .group(() => {
    router.put('/boards/:id', [BoardPagesController, 'updateBoard'])
    router.post('/boards/:id/image', [BoardPagesController, 'uploadBoardImage'])

    router.post('/columns', [BoardPagesController, 'storeColumn'])
    router.put('/columns/:id', [BoardPagesController, 'updateColumn'])
    router.delete('/columns/:id', [BoardPagesController, 'destroyColumn'])

    router.post('/groups', [BoardPagesController, 'storeGroup'])
    router.put('/groups/:id', [BoardPagesController, 'updateGroup'])
    router.delete('/groups/:id', [BoardPagesController, 'destroyGroup'])

    router.post('/cards', [BoardPagesController, 'storeCard'])
    router.post('/cards/reorder', [BoardPagesController, 'reorderCards'])
    router.put('/cards/:id', [BoardPagesController, 'updateCard'])
    router.delete('/cards/:id', [BoardPagesController, 'destroyCard'])
    router.post('/cards/:id/image', [BoardPagesController, 'uploadCardImage'])
  })
  .use(middleware.admin({ guards: ['web'] }))

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
        router.delete('/invitations/:id', [InvitationsController, 'destroy'])

        router.get('/admin/users', [AdminController, 'users'])
        router.delete('/admin/users/:id', [AdminController, 'deleteUser'])
        router.patch('/admin/users/:id/admin', [AdminController, 'toggleAdmin'])
      })
      .use(middleware.admin({ guards: ['api'] }))

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
