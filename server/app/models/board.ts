import { BoardSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Column from './column.js'
import { documentToHtml, fromDocument, toDocument } from '#helpers/rich_text'

export default class Board extends BoardSchema {
  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => {
      if (!value) return []
      try {
        return JSON.parse(value) as string[]
      } catch {
        return []
      }
    },
  })
  declare references: any

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
  declare document: any

  @hasMany(() => Column)
  declare columns: HasMany<typeof Column>
}
