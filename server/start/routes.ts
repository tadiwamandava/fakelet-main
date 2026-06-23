/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

const BoardsController = () => import('#controllers/boards_controller')
const ColumnsController = () => import('#controllers/columns_controller')
const GroupsController = () => import('#controllers/groups_controller')
const CardsController = () => import('#controllers/cards_controller')
const PasswordResetsController = () => import('#controllers/password_resets_controller')

router.get('/', () => {
  return { hello: 'world' }
})

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

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router.get('/boards/:id', [BoardsController, 'show'])
    //admin only routes
    router
      .group(() => {
        router.put('/boards/:id', [BoardsController, 'update'])
        router.post('/columns', [ColumnsController, 'store'])
        router.put('/columns/:id', [ColumnsController, 'update'])
        router.delete('/columns/:id', [ColumnsController, 'destroy'])

        router.post('/groups', [GroupsController, 'store'])
        router.put('/groups/:id', [GroupsController, 'update'])
        router.delete('/groups/:id', [GroupsController, 'destroy'])

        router.post('/cards', [CardsController, 'store'])
        router.put('/cards/:id', [CardsController, 'update'])
        router.delete('/cards/:id', [CardsController, 'destroy'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
