import { CardSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Group from './group.js'

export default class Card extends CardSchema {
  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>
}
