/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'boards.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/boards/:id',
    tokens: [{"old":"/api/v1/boards/:id","type":0,"val":"api","end":""},{"old":"/api/v1/boards/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/boards/:id","type":0,"val":"boards","end":""},{"old":"/api/v1/boards/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['boards.show']['types'],
  },
  'columns.store': {
    methods: ["POST"],
    pattern: '/api/v1/columns',
    tokens: [{"old":"/api/v1/columns","type":0,"val":"api","end":""},{"old":"/api/v1/columns","type":0,"val":"v1","end":""},{"old":"/api/v1/columns","type":0,"val":"columns","end":""}],
    types: placeholder as Registry['columns.store']['types'],
  },
  'columns.update': {
    methods: ["PUT"],
    pattern: '/api/v1/columns/:id',
    tokens: [{"old":"/api/v1/columns/:id","type":0,"val":"api","end":""},{"old":"/api/v1/columns/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/columns/:id","type":0,"val":"columns","end":""},{"old":"/api/v1/columns/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['columns.update']['types'],
  },
  'columns.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/columns/:id',
    tokens: [{"old":"/api/v1/columns/:id","type":0,"val":"api","end":""},{"old":"/api/v1/columns/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/columns/:id","type":0,"val":"columns","end":""},{"old":"/api/v1/columns/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['columns.destroy']['types'],
  },
  'groups.store': {
    methods: ["POST"],
    pattern: '/api/v1/groups',
    tokens: [{"old":"/api/v1/groups","type":0,"val":"api","end":""},{"old":"/api/v1/groups","type":0,"val":"v1","end":""},{"old":"/api/v1/groups","type":0,"val":"groups","end":""}],
    types: placeholder as Registry['groups.store']['types'],
  },
  'groups.update': {
    methods: ["PUT"],
    pattern: '/api/v1/groups/:id',
    tokens: [{"old":"/api/v1/groups/:id","type":0,"val":"api","end":""},{"old":"/api/v1/groups/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/groups/:id","type":0,"val":"groups","end":""},{"old":"/api/v1/groups/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['groups.update']['types'],
  },
  'groups.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/groups/:id',
    tokens: [{"old":"/api/v1/groups/:id","type":0,"val":"api","end":""},{"old":"/api/v1/groups/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/groups/:id","type":0,"val":"groups","end":""},{"old":"/api/v1/groups/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['groups.destroy']['types'],
  },
  'cards.store': {
    methods: ["POST"],
    pattern: '/api/v1/cards',
    tokens: [{"old":"/api/v1/cards","type":0,"val":"api","end":""},{"old":"/api/v1/cards","type":0,"val":"v1","end":""},{"old":"/api/v1/cards","type":0,"val":"cards","end":""}],
    types: placeholder as Registry['cards.store']['types'],
  },
  'cards.update': {
    methods: ["PUT"],
    pattern: '/api/v1/cards/:id',
    tokens: [{"old":"/api/v1/cards/:id","type":0,"val":"api","end":""},{"old":"/api/v1/cards/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/cards/:id","type":0,"val":"cards","end":""},{"old":"/api/v1/cards/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['cards.update']['types'],
  },
  'cards.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/cards/:id',
    tokens: [{"old":"/api/v1/cards/:id","type":0,"val":"api","end":""},{"old":"/api/v1/cards/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/cards/:id","type":0,"val":"cards","end":""},{"old":"/api/v1/cards/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['cards.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
