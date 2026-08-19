import { CardAttachmentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Card from './card.js'

export default class CardAttachment extends CardAttachmentSchema {
  @belongsTo(() => Card)
  declare card: BelongsTo<typeof Card>
}
