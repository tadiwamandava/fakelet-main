import { CardSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { documentToHtml, fromDocument, toDocument } from '#helpers/rich_text'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Group from './group.js'
import Column from './column.js'
import CardAttachment from './card_attachment.js'

export default class Card extends CardSchema {
  /**
   * Rich text, stored as a stringified Tiptap document in a text column.
   *
   * Same shape as `references` on Board: stringify on the way in, parse on the
   * way out, tolerate anything malformed rather than throwing. `consume` also
   * accepts rows still holding plain text from before this feature, so no data
   * migration was needed.
   *
   * `serialize` is what keeps the token API and the Inertia page props strings:
   * without it `/api/v1/boards/:id` would start returning Tiptap's node tree,
   * breaking every existing consumer and coupling a public contract to the
   * editor's internal format.
   *
   * When the column becomes JSONB, drop `prepare` — the driver serialises the
   * object itself, and `consume` already receives one.
   */
  @column({ prepare: fromDocument, consume: toDocument, serialize: documentToHtml })
  declare description: any

  @belongsTo(() => Group)
  declare group: BelongsTo<typeof Group>

  @belongsTo(() => Column)
  declare column: BelongsTo<typeof Column>

  /** Uploaded documents attached to the card, in display order. */
  @hasMany(() => CardAttachment)
  declare attachments: HasMany<typeof CardAttachment>
}
