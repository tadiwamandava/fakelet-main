import { ColumnSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Board from './board.js'
import Group from './group.js'
import Card from './card.js'

export default class Column extends ColumnSchema {
  @belongsTo(() => Board)
  declare board: BelongsTo<typeof Board>

  @hasMany(() => Group)
  declare groups: HasMany<typeof Group>

  // Ungrouped cards that belong directly to the column (group_id NULL)
  @hasMany(() => Card)
  declare cards: HasMany<typeof Card>
}
