import { InvitationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomInt } from 'node:crypto'
import User from './user.js'

export default class Invitation extends InvitationSchema {
  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  static generateKey(): string {
    // Use a cryptographically secure RNG — these keys grant admin signup.
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(randomInt(chars.length))
    }
    return result
  }
}
