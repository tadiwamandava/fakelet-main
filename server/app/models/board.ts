import { BoardSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Column from './column.js'

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

  @hasMany(() => Column)
  declare columns: HasMany<typeof Column>
}
