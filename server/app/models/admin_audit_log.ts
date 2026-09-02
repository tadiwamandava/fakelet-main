import { AdminAuditLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * One recorded access-control action.
 *
 * `actorEmail` and `targetEmail` duplicate what the relations would give,
 * deliberately: deleting an account is one of the actions logged, and the entry
 * has to stay readable once the row it points at is gone.
 */
export default class AdminAuditLog extends AdminAuditLogSchema {
  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'targetUserId' })
  declare targetUser: BelongsTo<typeof User>
}
