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

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
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
        router.post('/api/columns', [ColumnsController, 'store'])
        router.put('/api/columns/:id', [ColumnsController, 'update'])
        router.delete('/api/columns/:id', [ColumnsController, 'destroy'])

        router.post('/api/groups', [GroupsController, 'store'])
        router.put('/api/groups/:id', [GroupsController, 'update'])
        router.delete('/api/groups/:id', [GroupsController, 'destroy'])

        router.post('/api/cards', [CardsController, 'store'])
        router.put('/api/cards/:id', [CardsController, 'update'])
        router.delete('/api/cards/:id', [CardsController, 'destroy'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
