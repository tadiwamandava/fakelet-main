import { BoardSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Column from './column.js'

export default class Board extends BoardSchema {
  @hasMany(() => Column)
  declare columns: HasMany<typeof Column>
}
