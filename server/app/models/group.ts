import { GroupSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Column from './column.js'
import Card from './card.js'

export default class Group extends GroupSchema {
  @belongsTo(() => Column)
  declare column: BelongsTo<typeof Column>

  @hasMany(() => Card)
  declare cards: HasMany<typeof Card>
}
