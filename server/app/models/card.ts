import { CardSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Group from './group.js'
import Column from './column.js'

export default class Card extends CardSchema {
  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>

  @belongsTo(() => Column)
  declare column: BelongsTo<typeof Column>
}
