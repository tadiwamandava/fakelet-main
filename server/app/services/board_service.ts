import Board from '#models/board'

/**
 * Loads a single board with everything needed to render it: columns ordered by
 * position, each with its groups (and their cards) plus the ungrouped cards
 * that hang directly off the column. Soft-deleted cards are excluded.
 *
 * Shared by the JSON API (GET /api/v1/boards/:id) and the Inertia board page so
 * both always return the same shape. Throws if the board does not exist.
 */
export function findBoardForDisplay(boardId: number | string) {
  return Board.query()
    .where('id', boardId)
    .preload('columns', (columnQuery) =>
      columnQuery
        .orderBy('position')
        .preload('groups', (groupQuery) =>
          groupQuery
            .orderBy('position')
            .preload('cards', (cardQuery) =>
              cardQuery.where('is_deleted', false).orderBy('position')
            )
        )
        .preload('cards', (cardQuery) =>
          cardQuery.where('is_deleted', false).orderBy('position')
        )
    )
    .firstOrFail()
}
