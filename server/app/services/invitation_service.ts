import { DateTime } from 'luxon'
import User from '#models/user'
import Invitation from '#models/invitation'

/**
 * Looks up an unused invitation by key.
 *
 * Returns null when the key is unknown, already redeemed, or has no email
 * attached — the account's address comes from the invitation, so a key without
 * one cannot create a user.
 */
export async function findUsableInvitation(key: string | undefined | null) {
  const trimmed = key?.trim()
  if (!trimmed) return null

  const invitation = await Invitation.query().where('key', trimmed).whereNull('used_at').first()

  return invitation?.email ? invitation : null
}

/**
 * Creates the admin account for an invitation and marks the key redeemed.
 *
 * The email always comes from the invitation, never from user input, so an
 * invited person cannot sign themselves up under a different address.
 */
export async function redeemInvitation(invitation: Invitation, password: string): Promise<User> {
  const user = await User.create({ email: invitation.email!, password, isAdmin: true })

  invitation.usedAt = DateTime.now()
  invitation.usedBy = user.id
  await invitation.save()

  return user
}
