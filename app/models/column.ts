import { ColumnSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Board from './board.js'
import Group from './group.js'

export default class Column extends ColumnSchema {
  @belongsTo(() => Board)
  declare board: BelongsTo<typeof Board>

  @hasMany(() => Group)
  declare groups: HasMany<typeof Group>
}
