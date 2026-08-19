import { CardSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Group from './group.js'
import Column from './column.js'
import CardAttachment from './card_attachment.js'

export default class Card extends CardSchema {
  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>

  @belongsTo(() => Column)
  declare column: BelongsTo<typeof Column>

  /** Uploaded documents attached to the card, in display order. */
  @hasMany(() => CardAttachment)
  declare attachments: HasMany<typeof CardAttachment>
}
