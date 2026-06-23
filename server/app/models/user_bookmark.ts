import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UserBookmark extends BaseModel {
  static table = 'user_bookmarks'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare cardId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
