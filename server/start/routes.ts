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

router.get('/', () => ({ hello: 'world' }))

// Temporary Inertia smoke test (Phase 2) — remove once real pages exist.
router.get('/ping-ui', ({ inertia }) => inertia.render('ping_ui', {}))

// Serve uploaded files (outside /api/v1 so img src="/uploads/..." works)
router.get('/uploads/:filename', [BoardsController, 'serveUpload'])

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
