import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'
import Invitation from '#models/invitation'
import AdminAuditLog from '#models/admin_audit_log'

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

/**
 * Records an access-control action.
 *
 * Written inside the caller's transaction, so the log and the change it
 * describes land together or not at all — a log that could disagree with
 * reality would be worse than no log. The actor's and target's emails are
 * copied in rather than looked up later, because deleting an account is one of
 * the things recorded here.
 */
async function record(
  trx: TransactionClientContract,
  actor: User,
  action: string,
  target: User | null,
  summary: string
) {
  await AdminAuditLog.create(
    {
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      targetUserId: target?.id ?? null,
      targetEmail: target?.email ?? null,
      summary,
    },
    { client: trx }
  )
}

/** The acting user, loaded in-transaction so the log records who really did it. */
async function actorFor(trx: TransactionClientContract, actorId: number) {
  const actor = await User.query({ client: trx }).where('id', actorId).first()
  if (!actor) throw new AdminWriteError('Your account no longer exists.')
  return actor
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

    const granting = !user.isAdmin
    user.useTransaction(trx).merge({ isAdmin: granting })
    await user.save()

    await record(
      trx,
      await actorFor(trx, actorId),
      granting ? 'admin.granted' : 'admin.revoked',
      user,
      `${granting ? 'Granted' : 'Revoked'} admin access for ${user.email}`
    )
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

    await record(
      trx,
      await actorFor(trx, actorId),
      becomingMaster ? 'master.granted' : 'master.revoked',
      user,
      `${becomingMaster ? 'Granted' : 'Revoked'} master admin for ${user.email}`
    )
    return user
  })
}

export function deleteUser(actorId: number, targetId: number) {
  return db.transaction(async (trx) => {
    assertNotSelf(actorId, targetId, 'delete')

    const user = await assertNotLastMaster(trx, targetId, 'deleted')
    const actor = await actorFor(trx, actorId)
    const email = user.email

    await user.useTransaction(trx).delete()
    // The row is gone, so the log keeps the only remaining record of who it was.
    await record(trx, actor, 'user.deleted', null, `Deleted the account ${email}`)
    return user
  })
}

/** Cancels an invitation that has not been redeemed. */
export function revokeInvitation(actorId: number, id: number | string) {
  return db.transaction(async (trx) => {
    const invitation = await Invitation.query({ client: trx }).where('id', id).forUpdate().first()
    if (!invitation) throw new AdminWriteError('That invitation no longer exists.')
    if (invitation.usedAt) {
      throw new AdminWriteError('Cannot revoke an invitation that was already used.')
    }

    const email = invitation.email
    await invitation.useTransaction(trx).delete()

    await record(
      trx,
      await actorFor(trx, actorId),
      'invitation.revoked',
      null,
      `Revoked the invitation for ${email ?? 'an unknown address'}`
    )
    return invitation
  })
}

/** The log, newest first, for the dashboard. */
export function listAuditLog(limit = 100) {
  return AdminAuditLog.query().orderBy('created_at', 'desc').orderBy('id', 'desc').limit(limit)
}
