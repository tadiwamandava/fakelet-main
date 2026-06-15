import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'boards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'columns.store': { paramsTuple?: []; params?: {} }
    'columns.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'columns.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'groups.store': { paramsTuple?: []; params?: {} }
    'groups.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'groups.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.store': { paramsTuple?: []; params?: {} }
    'cards.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'boards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'boards.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'columns.store': { paramsTuple?: []; params?: {} }
    'groups.store': { paramsTuple?: []; params?: {} }
    'cards.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'columns.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'groups.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'columns.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'groups.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cards.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}