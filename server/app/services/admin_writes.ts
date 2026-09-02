import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Invitation from '#models/invitation'

/**
 * Every write that changes who can do what.
 *
 * Admin access can be granted or revoked down three different paths — the
 * promote/demote toggle, deleting the account outright, and invitations, which
 * create accounts that are already admins. Guarding one of them in a controller
 * leaves the others open, so the rules live here and both the Inertia pages and
 * /api/v1 call in, the same arrangement `board_writes` uses for boards.
 *
 * Deliberately NOT guarded here: sending an invitation. Ordinary admins may
 * bring people in, they simply cannot remove or promote anyone afterwards. A
 * redeemed invitation only ever creates an ordinary admin, so this cannot be
 * used to reach master.
 */

/** The action is not allowed, with a reason worth showing the user. */
export class AdminWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminWriteError'
  }
}

/**
 * Refuses a change that would leave nobody able to administer access.
 *
 * With the last master gone there is no way to promote anyone ever again — the
 * only route back is editing the database by hand — so this is checked inside
 * the transaction that would make it true, not before it.
 */
async function assertNotLastMaster(trx: any, userId: number, what: string) {
  const target = await User.query({ client: trx }).where('id', userId).forUpdate().first()
  if (!target) throw new AdminWriteError('That account no longer exists.')
  if (!target.isMasterAdmin) return target

  const [{ count }] = await trx.from('users').where('is_master_admin', true).count('* as count')
  if (Number(count) <= 1) {
    throw new AdminWriteError(
      `This is the only master admin, so it cannot be ${what}. Promote another master first.`
    )
  }

  return target
}

/** Nobody may change their own access — the usual way people lock themselves out. */
function assertNotSelf(actorId: number, targetId: number, what: string) {
  if (actorId === targetId) throw new AdminWriteError(`You cannot ${what} your own account.`)
}

/**
 * Grants or removes ordinary admin access.
 *
 * Demoting a master would leave them with neither tier, so the master flag has
 * to go first — an explicit step rather than something that happens silently as
 * a side effect of this one.
 */
export function toggleAdmin(actorId: number, targetId: number) {
  return db.transaction(async (trx) => {
    assertNotSelf(actorId, targetId, 'change admin access on')

    const user = await User.query({ client: trx }).where('id', targetId).forUpdate().first()
    if (!user) throw new AdminWriteError('That account no longer exists.')

    if (user.isMasterAdmin) {
      throw new AdminWriteError('Remove master access first, then change admin access.')
    }

    user.useTransaction(trx).merge({ isAdmin: !user.isAdmin })
    await user.save()
    return user
  })
}

/**
 * Grants or removes master access.
 *
 * Promoting also grants ordinary admin, keeping the invariant that master
 * implies admin — a master who was not an admin would fail every ordinary
 * admin check in the app.
 */
export function toggleMaster(actorId: number, targetId: number) {
  return db.transaction(async (trx) => {
    assertNotSelf(actorId, targetId, 'change master access on')

    const user = await assertNotLastMaster(trx, targetId, 'demoted')

    const becomingMaster = !user.isMasterAdmin
    user.useTransaction(trx).merge({
      isMasterAdmin: becomingMaster,
      isAdmin: becomingMaster ? true : user.isAdmin,
    })
    await user.save()
    return user
  })
}

export function deleteUser(actorId: number, targetId: number) {
  return db.transaction(async (trx) => {
    assertNotSelf(actorId, targetId, 'delete')

    const user = await assertNotLastMaster(trx, targetId, 'deleted')
    await user.useTransaction(trx).delete()
    return user
  })
}

/** Cancels an invitation that has not been redeemed. */
export function revokeInvitation(id: number | string) {
  return db.transaction(async (trx) => {
    const invitation = await Invitation.query({ client: trx }).where('id', id).forUpdate().first()
    if (!invitation) throw new AdminWriteError('That invitation no longer exists.')
    if (invitation.usedAt) {
      throw new AdminWriteError('Cannot revoke an invitation that was already used.')
    }

    await invitation.useTransaction(trx).delete()
    return invitation
  })
}
