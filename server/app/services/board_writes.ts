import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Board from '#models/board'
import Card from '#models/card'
import Column from '#models/column'
import Group from '#models/group'

/**
 * Every write that can race another editor.
 *
 * Two admins on the same board hold independent snapshots of it, and neither
 * is told when the other saves. Left to the naive implementation that means a
 * write computed against a stale snapshot silently destroys the newer one, or
 * targets a parent that no longer exists. These helpers close that gap:
 *
 *  - positions are assigned by the database, never by the client, so two
 *    concurrent inserts can't claim the same slot;
 *  - a card update carries the version it was loaded at and is refused if the
 *    row has moved on;
 *  - a parent is verified inside the same transaction that writes the child,
 *    so a container deleted a moment ago fails cleanly instead of raising a
 *    foreign-key error or leaving a card attached to nothing.
 *
 * Both the Inertia pages and the token API go through here, so the two
 * surfaces cannot drift apart.
 */

export const MAX_COLUMNS = 8

/** The row a write targets (or its parent) has been removed by someone else. */
export class MissingTargetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissingTargetError'
  }
}

/** The row changed after the client loaded it; the client's copy is stale. */
export class StaleWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StaleWriteError'
  }
}

/** A rule was broken that the user can act on (column cap, bad parent). */
export class WriteRejectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WriteRejectedError'
  }
}

type Trx = TransactionClientContract
type CardParent =
  | { kind: 'group'; groupId: number; columnId: null }
  | { kind: 'column'; groupId: null; columnId: number }

// ── Which board does this belong to? ─────────────────────────────────────────

/**
 * Nothing below a board carries a board id of its own, so telling the board's
 * viewers that something changed means walking back up the chain.
 *
 * Callers must resolve this BEFORE a destructive write — once the row is gone
 * there is nothing left to walk. Each returns null when the row no longer
 * exists, which the broadcaster treats as "nobody to notify".
 */
export async function boardIdForColumn(id: number | string): Promise<number | null> {
  const row = await db.from('columns').where('id', id).select('board_id').first()
  return row?.board_id ?? null
}

export async function boardIdForGroup(id: number | string): Promise<number | null> {
  const row = await db
    .from('groups')
    .join('columns', 'columns.id', 'groups.column_id')
    .where('groups.id', id)
    .select('columns.board_id as board_id')
    .first()
  return row?.board_id ?? null
}

/** A card reaches its board through its group, or directly through its column. */
export async function boardIdForCard(id: number | string): Promise<number | null> {
  const row = await db
    .from('cards')
    .leftJoin('groups', 'groups.id', 'cards.group_id')
    .leftJoin('columns', 'columns.id', db.raw('coalesce(cards.column_id, groups.column_id)'))
    .where('cards.id', id)
    .select('columns.board_id as board_id')
    .first()
  return row?.board_id ?? null
}

/** The two foreign keys a parent implies, without the discriminant. */
function parentKeys(parent: CardParent) {
  return { groupId: parent.groupId, columnId: parent.columnId }
}

/**
 * Next free position in a container.
 *
 * Read inside the caller's transaction after the parent row has been locked,
 * so two inserts into the same container serialise instead of both reading the
 * same maximum.
 */
async function nextPosition(trx: Trx, table: string, column: string, parentId: number) {
  const result = await trx.from(table).where(column, parentId).max('position as max')
  const max = result[0]?.max
  return max === null || max === undefined ? 0 : Number(max) + 1
}

/**
 * Normalises the parent a card was asked to live under.
 *
 * A card hangs off exactly one of a group or a column — the board query loads
 * grouped and ungrouped cards through different relations, so a card with both
 * set renders twice and a card with neither renders nowhere at all. Rejecting
 * the ambiguous cases here is what stops those invisible orphan rows.
 */
function readParent(input: { groupId?: unknown; columnId?: unknown }): CardParent {
  const groupId = Number(input.groupId) || null
  const columnId = Number(input.columnId) || null

  if (groupId && columnId) {
    throw new WriteRejectedError('A card belongs to either a group or a column, not both.')
  }
  if (groupId) return { kind: 'group', groupId, columnId: null }
  if (columnId) return { kind: 'column', groupId: null, columnId }
  throw new WriteRejectedError('A card must be created inside a group or a column.')
}

/** Locks the parent row so a concurrent delete can't slip in behind the check. */
async function lockCardParent(trx: Trx, parent: CardParent) {
  if (parent.kind === 'group') {
    const group = await Group.query({ client: trx }).where('id', parent.groupId).forUpdate().first()
    if (!group) throw new MissingTargetError('That group was deleted by someone else.')
    return
  }
  const column = await Column.query({ client: trx }).where('id', parent.columnId).forUpdate().first()
  if (!column) throw new MissingTargetError('That column was deleted by someone else.')
}

/** Next free slot inside whichever container the parent names. */
function nextPositionIn(trx: Trx, parent: CardParent) {
  return parent.kind === 'group'
    ? nextPosition(trx, 'cards', 'group_id', parent.groupId)
    : nextPosition(trx, 'cards', 'column_id', parent.columnId)
}

// ── Cards ────────────────────────────────────────────────────────────────────

export function createCard(attrs: Record<string, any>, userId: number | null) {
  return db.transaction(async (trx) => {
    const parent = readParent(attrs)
    await lockCardParent(trx, parent)

    const position = await nextPositionIn(trx, parent)
    const { position: _ignored, groupId: _g, columnId: _c, version: _v, ...rest } = attrs

    return Card.create(
      { ...rest, ...parentKeys(parent), position, version: 1, createdBy: userId },
      { client: trx }
    )
  })
}

/**
 * Applies an edit to a card, refusing it if someone else got there first.
 *
 * `expectedVersion` is the version the editor was opened at. When it no longer
 * matches, the caller is expected to reload rather than overwrite — that is
 * the whole point, so a caller that passes nothing (the token API, scripts)
 * keeps the old last-writer-wins behaviour deliberately.
 */
export function updateCard(
  id: number | string,
  attrs: Record<string, any>,
  userId: number | null,
  expectedVersion?: number | null
) {
  return db.transaction(async (trx) => {
    /**
     * Archived rows are treated as gone. Deleting a column detaches its cards
     * rather than destroying them, so the row survives the cascade — but it is
     * off the board, and letting an edit land on it would report success for a
     * card the user can no longer see.
     */
    const card = await Card.query({ client: trx })
      .where('id', id)
      .where('is_deleted', false)
      .forUpdate()
      .first()
    if (!card) throw new MissingTargetError('That card was deleted by someone else.')

    if (expectedVersion != null && (card.version ?? 1) !== expectedVersion) {
      throw new StaleWriteError('Someone else edited this card while you had it open.')
    }

    const { version: _v, position: _p, groupId, columnId, ...rest } = attrs

    /**
     * A move is only applied when the form actually asked for one. The editor
     * omits both keys unless the Location select changed, so an ordinary text
     * edit can never reparent (or orphan) the card.
     */
    const moving = groupId !== undefined || columnId !== undefined
    let move: { groupId: number | null; columnId: number | null } | Record<string, never> = {}
    let position = card.position

    if (moving) {
      const parent = readParent({ groupId, columnId })
      await lockCardParent(trx, parent)
      const sameContainer =
        parent.kind === 'group'
          ? card.groupId === parent.groupId
          : card.columnId === parent.columnId

      if (!sameContainer) {
        move = parentKeys(parent)
        position = await nextPositionIn(trx, parent)
      }
    }

    card.useTransaction(trx)
    card.merge({
      ...rest,
      ...move,
      position,
      version: (card.version ?? 1) + 1,
      updatedBy: userId,
    })
    await card.save()
    return card
  })
}

export function softDeleteCard(id: number | string, userId: number | null) {
  return db.transaction(async (trx) => {
    const card = await Card.query({ client: trx })
      .where('id', id)
      .where('is_deleted', false)
      .forUpdate()
      .first()
    if (!card) throw new MissingTargetError('That card has already been deleted.')

    card.useTransaction(trx)
    card.merge({ isDeleted: true, version: (card.version ?? 1) + 1, updatedBy: userId })
    await card.save()
    return card
  })
}

/**
 * Persists a new order for one container's cards.
 *
 * The ids come from the client's snapshot, which may be missing cards another
 * user has since added and may name cards that have since moved away. Rather
 * than trusting the list, the container is re-read and renumbered from
 * scratch: requested cards take the order given, anything else keeps its
 * relative place at the end. Every live card ends up with a distinct position,
 * which is what stops cards swapping places on the next reload.
 */
export function reorderCards(ids: number[], userId: number | null) {
  return db.transaction(async (trx) => {
    const requested = await Card.query({ client: trx })
      .whereIn('id', ids)
      .where('is_deleted', false)
      .forUpdate()
    if (requested.length === 0) return

    const anchor = requested[0]
    const key = anchor.groupId ? 'group_id' : 'column_id'
    const parentId = anchor.groupId ?? anchor.columnId
    if (!parentId) throw new WriteRejectedError('Those cards are not in a container.')

    const inContainer = new Set(
      requested.filter((c) => (c.groupId ?? c.columnId) === parentId).map((c) => c.id)
    )

    const current = await Card.query({ client: trx })
      .where(key, parentId)
      .where('is_deleted', false)
      .orderBy('position')
      .orderBy('id')
      .forUpdate()

    const ordered = [
      ...ids.filter((id) => inContainer.has(id)),
      ...current.map((c) => c.id).filter((id) => !inContainer.has(id)),
    ]

    for (const [index, id] of ordered.entries()) {
      await trx.from('cards').where('id', id).update({ position: index, updated_by: userId })
    }
  })
}

// ── Columns ──────────────────────────────────────────────────────────────────

export function createColumn(boardId: number, attrs: Record<string, any>, userId: number | null) {
  return db.transaction(async (trx) => {
    const board = await Board.query({ client: trx }).where('id', boardId).forUpdate().first()
    if (!board) throw new MissingTargetError('That board was deleted by someone else.')

    const [{ count }] = await trx.from('columns').where('board_id', boardId).count('* as count')
    if (Number(count) >= MAX_COLUMNS) {
      throw new WriteRejectedError(`A board can only have a maximum of ${MAX_COLUMNS} columns.`)
    }

    const position = await nextPosition(trx, 'columns', 'board_id', boardId)
    return Column.create({ ...attrs, boardId, position, createdBy: userId }, { client: trx })
  })
}

export function renameColumn(id: number | string, title: string, userId: number | null) {
  return db.transaction(async (trx) => {
    const column = await Column.query({ client: trx }).where('id', id).forUpdate().first()
    if (!column) throw new MissingTargetError('That column was deleted by someone else.')

    column.useTransaction(trx).merge({ title, updatedBy: userId })
    await column.save()
    return column
  })
}

/**
 * Removes a column and archives everything under it.
 *
 * The foreign keys cascade, so a plain delete would hard-remove the column's
 * groups and every card in them — including whatever another admin was editing
 * at that moment, with no way back. Detaching the cards first takes them out
 * of the cascade's reach and leaves them as ordinary soft-deleted rows,
 * matching what deleting a single card already does.
 */
export function deleteColumn(id: number | string, userId: number | null) {
  return db.transaction(async (trx) => {
    const column = await Column.query({ client: trx }).where('id', id).forUpdate().first()
    if (!column) throw new MissingTargetError('That column has already been deleted.')

    const groupIds = (await trx.from('groups').where('column_id', column.id).select('id')).map(
      (g: { id: number }) => g.id
    )

    await trx
      .from('cards')
      .where((q) => {
        q.where('column_id', column.id)
        if (groupIds.length) q.orWhereIn('group_id', groupIds)
      })
      .update({ is_deleted: true, group_id: null, column_id: null, updated_by: userId })

    await column.useTransaction(trx).delete()
  })
}

// ── Groups ───────────────────────────────────────────────────────────────────

export function createGroup(columnId: number, attrs: Record<string, any>, userId: number | null) {
  return db.transaction(async (trx) => {
    const column = await Column.query({ client: trx }).where('id', columnId).forUpdate().first()
    if (!column) throw new MissingTargetError('That column was deleted by someone else.')

    const position = await nextPosition(trx, 'groups', 'column_id', columnId)
    return Group.create({ ...attrs, columnId, position, createdBy: userId }, { client: trx })
  })
}

export function renameGroup(id: number | string, title: string, userId: number | null) {
  return db.transaction(async (trx) => {
    const group = await Group.query({ client: trx }).where('id', id).forUpdate().first()
    if (!group) throw new MissingTargetError('That group was deleted by someone else.')

    group.useTransaction(trx).merge({ title, updatedBy: userId })
    await group.save()
    return group
  })
}

/**
 * Removes a group, keeping its cards on the board.
 *
 * Unlike deleting a whole column, the cards still have somewhere to live, so
 * they are moved up into the parent column as ungrouped cards rather than
 * being destroyed by the cascade. An editor who was mid-sentence on one of
 * them finds it a level up instead of gone.
 */
export function deleteGroup(id: number | string, userId: number | null) {
  return db.transaction(async (trx) => {
    const group = await Group.query({ client: trx }).where('id', id).forUpdate().first()
    if (!group) throw new MissingTargetError('That group has already been deleted.')

    const columnId = group.columnId!
    const base = await nextPosition(trx, 'cards', 'column_id', columnId)
    const cards = await trx
      .from('cards')
      .where('group_id', group.id)
      .orderBy('position')
      .orderBy('id')
      .select('id')

    for (const [index, card] of cards.entries()) {
      await trx
        .from('cards')
        .where('id', card.id)
        .update({ group_id: null, column_id: columnId, position: base + index, updated_by: userId })
    }

    await group.useTransaction(trx).delete()
  })
}
